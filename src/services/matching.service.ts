import mongoose from "mongoose";
import { RideRequest } from "../models/rideRequest.model";
import { RidePool } from "../models/ridePool.model";
import { Cab } from "../models/cab.model";
import { getRedis } from "../config/redis";
import { calculatePrice } from "./pricing.service";
import { calculateDistanceKm } from "../utils/distance";

export const matchRideToPool = async (rideId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ride = await RideRequest.findById(rideId).session(session);
    if (!ride) throw new Error("Ride not found");
    if (ride.status !== "PENDING")
      throw new Error("Ride not eligible");

    const activePools = await RidePool.find({ status: "ACTIVE" }).session(session);
    const redis = getRedis();

    let bestPool: any = null;
    let minDetour = Infinity;

    // STEP 1: Find best pool based on minimum incremental detour
    for (const pool of activePools) {
      const cab = await Cab.findById(pool.cabId).session(session);
      if (!cab) continue;

      const seatAvailable = cab.seatCapacity - pool.totalSeatsUsed;
      const luggageAvailable = cab.luggageCapacity - pool.totalLuggageUsed;

      if (seatAvailable < ride.seatRequired || luggageAvailable < ride.luggageCount) {
        continue;
      }

      if (pool.members.length === 0) continue;

      const lastMemberId = pool.members[pool.members.length - 1];
      const lastMember = await RideRequest.findById(lastMemberId).session(session);
      if (!lastMember) continue;

      const pickupDetour = calculateDistanceKm(
        lastMember.destination.lat,
        lastMember.destination.lng,
        ride.source.lat,
        ride.source.lng
      );

      const rideDistance = calculateDistanceKm(
        ride.source.lat,
        ride.source.lng,
        ride.destination.lat,
        ride.destination.lng
      );

      const incrementalDetour = pickupDetour + rideDistance;

      // Enforce new rider tolerance
      if (incrementalDetour > ride.detourToleranceKm) {
        continue;
      }

      if (incrementalDetour < minDetour) {
        minDetour = incrementalDetour;
        bestPool = pool;
      }
    }

    // STEP 2: If suitable pool found → lock & assign
    if (bestPool) {
      const lockKey = `lock:pool:${bestPool._id}`;
      const lock = await redis.set(lockKey, "locked", "EX", 5, "NX");

      if (lock) {
        try {
          bestPool.members.push(ride._id as any);
          bestPool.totalSeatsUsed += ride.seatRequired;
          bestPool.totalLuggageUsed += ride.luggageCount;
          bestPool.estimatedRouteDistanceKm += minDetour;

          await bestPool.save({ session });

          ride.status = "MATCHED";
          ride.poolId = bestPool._id as any;

          const poolSize = bestPool.members.length;

          // Recalculate price for all members
          for (const memberId of bestPool.members) {
            const memberRide = await RideRequest.findById(memberId).session(session);
            if (!memberRide) continue;

            const baseDistanceKm = memberRide.baseDistanceKm ?? 10;

            memberRide.price = calculatePrice({
              baseDistanceKm,
              detourKm: 0,
              poolSize,
            });

            await memberRide.save({ session });
          }

          await redis.del(lockKey);
          await session.commitTransaction();
          session.endSession();

          return bestPool;
        } catch (err) {
          await redis.del(lockKey);
          throw err;
        }
      }
    }

    // STEP 3: No suitable pool → create new pool
    const cab = await Cab.findOne({ isAvailable: true }).session(session);
    if (!cab) throw new Error("No available cab");

    const newPool = await RidePool.create(
      [
        {
          cabId: cab._id,
          members: [ride._id],
          totalSeatsUsed: ride.seatRequired,
          totalLuggageUsed: ride.luggageCount,
          estimatedRouteDistanceKm: calculateDistanceKm(
            ride.source.lat,
            ride.source.lng,
            ride.destination.lat,
            ride.destination.lng
          ),
        },
      ],
      { session }
    );

    cab.isAvailable = false;
    cab.currentPoolId = newPool[0]._id as any;
    await cab.save({ session });

    ride.status = "MATCHED";
    ride.poolId = newPool[0]._id as any;

    const baseDistanceKm = ride.baseDistanceKm ?? 10;

    ride.price = calculatePrice({
      baseDistanceKm,
      detourKm: 0,
      poolSize: 1,
    });

    await ride.save({ session });

    await session.commitTransaction();
    session.endSession();

    return newPool[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};




// import mongoose from "mongoose";
// import { RideRequest } from "../models/rideRequest.model";
// import { RidePool } from "../models/ridePool.model";
// import { Cab } from "../models/cab.model";
// import { getRedis } from "../config/redis";
// import { calculatePrice } from "./pricing.service";

// export const matchRideToPool = async (rideId: string) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const ride = await RideRequest.findById(rideId).session(session);

//     if (!ride) throw new Error("Ride not found");
//     if (ride.status !== "PENDING") throw new Error("Ride not eligible");

//     const activePools = await RidePool.find({ status: "ACTIVE" }).session(session);

//     const redis = getRedis();

//     for (const pool of activePools) {
//       const lockKey = `lock:pool:${pool._id}`;
//       const lock = await redis.set(lockKey, "locked", "EX", 5, "NX");

//       if (!lock) continue;

//       try {
//         const cab = await Cab.findById(pool.cabId).session(session);
//         if (!cab) {
//           await redis.del(lockKey);
//           continue;
//         }

//         const seatAvailable = cab.seatCapacity - pool.totalSeatsUsed;
//         const luggageAvailable = cab.luggageCapacity - pool.totalLuggageUsed;

//         if (seatAvailable >= ride.seatRequired && luggageAvailable >= ride.luggageCount) {
//           pool.members.push(ride._id as any);
//           pool.totalSeatsUsed += ride.seatRequired;
//           pool.totalLuggageUsed += ride.luggageCount;

//           await pool.save({ session });

//           ride.status = "MATCHED";
//           ride.poolId = pool._id as any;

//           // Pricing logic
//           const baseDistanceKm = 10; // static for now
//           const detourKm = 0;
//           const poolSize = pool.members.length;

//           ride.price = calculatePrice({baseDistanceKm,detourKm,poolSize,});

//           await ride.save({ session });

//           // Recalculate price for ALL rides in pool
//           for (const memberId of pool.members) {
//             const memberRide = await RideRequest.findById(memberId).session(session);
//             if (!memberRide) continue;

//             memberRide.price = calculatePrice({baseDistanceKm,detourKm,poolSize, });

//             await memberRide.save({ session });
//           }

//           await redis.del(lockKey);

//           await session.commitTransaction();
//           session.endSession();

//           return pool;
//         }

//         await redis.del(lockKey);
//       } catch (err) {
//         await redis.del(lockKey);
//         throw err;
//       }
//     }

//     // Create new pool
//     const cab = await Cab.findOne({ isAvailable: true }).session(session);
//     if (!cab) throw new Error("No available cab");

//     const newPool = await RidePool.create(
//       [
//         {
//           cabId: cab._id,
//           members: [ride._id],
//           totalSeatsUsed: ride.seatRequired,
//           totalLuggageUsed: ride.luggageCount,
//           estimatedRouteDistanceKm: 0,
//         },
//       ],
//       { session }
//     );

//     cab.isAvailable = false;
//     cab.currentPoolId = newPool[0]._id as any;
//     await cab.save({ session });

//     ride.status = "MATCHED";
//     ride.poolId = newPool[0]._id as any;

//     const baseDistanceKm = 10;
//     const detourKm = 0;
//     const poolSize = 1;

//     ride.price = calculatePrice({ baseDistanceKm,detourKm,poolSize, });

//     await ride.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return newPool[0];
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };



// import mongoose from "mongoose";
// import { RideRequest } from "../models/rideRequest.model";
// import { RidePool } from "../models/ridePool.model";
// import { Cab } from "../models/cab.model";
// import { getRedis } from "../config/redis";
// import { calculatePrice } from "./pricing.service";

// export const matchRideToPool = async (rideId: string) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const ride = await RideRequest.findById(rideId).session(session);

//     if (!ride) throw new Error("Ride not found");
//     if (ride.status !== "PENDING") throw new Error("Ride not eligible");

//     // Find active pools
//     const activePools = await RidePool.find({ status: "ACTIVE" }).session(session);

//     const redis = getRedis();

//     for (const pool of activePools) {
//       const lockKey = `lock:pool:${pool._id}`;

//       // Try acquiring lock
//       const lock = await redis.set(lockKey, "locked","EX",5, "NX");


//       if (!lock) {   // Another request is modifying this pool
//         continue;
//       }

//       try {
//         const cab = await Cab.findById(pool.cabId).session(session);
//         if (!cab) {
//           await redis.del(lockKey);
//           continue;
//         }

//         const seatAvailable = cab.seatCapacity - pool.totalSeatsUsed;
//         const luggageAvailable = cab.luggageCapacity - pool.totalLuggageUsed;

//         if (
//           seatAvailable >= ride.seatRequired &&
//           luggageAvailable >= ride.luggageCount
//         ) {
//           pool.members.push(ride._id as any);
//           pool.totalSeatsUsed += ride.seatRequired;
//           pool.totalLuggageUsed += ride.luggageCount;

//           await pool.save({ session });

//           ride.status = "MATCHED";
//           ride.poolId = pool._id as any;
//           await ride.save({ session });

//           await redis.del(lockKey);

//           await session.commitTransaction();
//           session.endSession();

//           return pool;
//         }

//         await redis.del(lockKey);
//       } catch (err) {
//         await redis.del(lockKey);
//         throw err;
//       }
//     }

//     // No pool found → create new pool

//     const cab = await Cab.findOne({ isAvailable: true }).session(session);
//     if (!cab) throw new Error("No available cab");

//     const newPool = await RidePool.create(
//       [
//         {
//           cabId: cab._id,
//           members: [ride._id],
//           totalSeatsUsed: ride.seatRequired,
//           totalLuggageUsed: ride.luggageCount,
//           estimatedRouteDistanceKm: 0,
//         },
//       ],
//       { session }
//     );

//     cab.isAvailable = false;
//     cab.currentPoolId = newPool[0]._id as any;
//     await cab.save({ session });

//     ride.status = "MATCHED";
//     ride.poolId = newPool[0]._id as any;
//     await ride.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return newPool[0];
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };
