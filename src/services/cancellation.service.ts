// import mongoose from "mongoose";
// import { RideRequest } from "../models/rideRequest.model";
// import { RidePool } from "../models/ridePool.model";
// import { Cab } from "../models/cab.model";
// import { getRedis } from "../config/redis";
// import { calculatePrice } from "./pricing.service";

// export const cancelRide = async (rideId: string) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const ride = await RideRequest.findById(rideId).session(session);

//     if (!ride) throw new Error("Ride not found");
//     if (ride.status === "CANCELLED")
//       throw new Error("Ride already cancelled");

//     // If ride not matched yet → simple cancel
//     if (!ride.poolId) {
//       ride.status = "CANCELLED";
//       await ride.save({ session });

//       await session.commitTransaction();
//       session.endSession();
//       return { message: "Ride cancelled successfully" };
//     }

//     const pool = await RidePool.findById(ride.poolId).session(session);
//     if (!pool) throw new Error("Pool not found");

//     const redis = getRedis();
//     const lockKey = `lock:pool:${pool._id}`;

//     const lock = await redis.set(lockKey, "locked", "EX", 5, "NX");
//     if (!lock) throw new Error("Pool is being modified, try again");

//     try {
//       // Remove ride from pool
//       pool.members = pool.members.filter(
//         (memberId) => memberId.toString() !== ride._id.toString()
//       );

//       pool.totalSeatsUsed -= ride.seatRequired;
//       pool.totalLuggageUsed -= ride.luggageCount;

//       ride.status = "CANCELLED";
//       ride.poolId = null;

//       await ride.save({ session });

//       // If pool empty → cleanup
//       if (pool.members.length === 0) {
//         pool.status = "CANCELLED";

//         const cab = await Cab.findById(pool.cabId).session(session);
//         if (cab) {
//           cab.isAvailable = true;
//           cab.currentPoolId = null;
//           await cab.save({ session });
//         }
//       }

//       await pool.save({ session });

//       await redis.del(lockKey);

//       await session.commitTransaction();
//       session.endSession();

//       return { message: "Ride cancelled and pool updated" };
//     } catch (err) {
//       await redis.del(lockKey);
//       throw err;
//     }
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };


import mongoose from "mongoose";
import { RideRequest } from "../models/rideRequest.model";
import { RidePool } from "../models/ridePool.model";
import { Cab } from "../models/cab.model";
import { getRedis } from "../config/redis";
import { calculatePrice } from "./pricing.service";

export const cancelRide = async (rideId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ride = await RideRequest.findById(rideId).session(session);  //fetch passenger booking.
    if (!ride) throw new Error("Ride not found");
    if (ride.status === "CANCELLED") throw new Error("Ride already cancelled");

    if (!ride.poolId) {
      ride.status = "CANCELLED";
      ride.price = 0;
      await ride.save({ session });

      await session.commitTransaction();
      session.endSession();
      return { message: "Ride cancelled" };
    }

    const pool = await RidePool.findById(ride.poolId).session(session); //fetch the shared cab. as a pool contains ride1 and ride2.
    if (!pool) throw new Error("Pool not found");

    const redis = getRedis();
    const lockKey = `lock:pool:${pool._id}`;
    const lock = await redis.set(lockKey, "locked", "EX", 5, "NX");

    if (!lock) throw new Error("Pool is being modified");

    try {
      pool.members = pool.members.filter((id) => id.toString() !== ride._id.toString());  //Remove Ride From Pool

      pool.totalSeatsUsed -= ride.seatRequired;
      pool.totalLuggageUsed -= ride.luggageCount;

      ride.status = "CANCELLED";
      ride.poolId = null;
      ride.price = 0;
      await ride.save({ session });

      if (pool.members.length > 0) {   //If Pool Still Has Members
        const poolSize = pool.members.length;  //We recalculate pricing for each ride in pool because pool size changed.

        for (const memberId of pool.members) {
          const memberRide = await RideRequest.findById(memberId).session(session);
          if (!memberRide) continue;

          const baseDistanceKm = memberRide.baseDistanceKm ?? 10;

          memberRide.price = calculatePrice({baseDistanceKm,detourKm: 0,poolSize,});  //If 2 people → each paid ₹200, Now 1 person → maybe ₹300

          await memberRide.save({ session });
        }
      } else {    //if (pool.members.length === 0)  ==> Only ride1 existed. Now cancelled.
        pool.status = "CANCELLED";

        const cab = await Cab.findById(pool.cabId).session(session);
        if (cab) {
          cab.isAvailable = true;
          cab.currentPoolId = null;
          await cab.save({ session });
        }
      }

      await pool.save({ session });
      await redis.del(lockKey);

      await session.commitTransaction();
      session.endSession();

      return { message: "Ride cancelled and pool updated" };
    } catch (err) {
      await redis.del(lockKey);
      throw err;
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
