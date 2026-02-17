import { Request, Response } from "express";
import { RidePool } from "../models/ridePool.model";

export const getAllPools = async (req: Request, res: Response) => {
  try {
    const pools = await RidePool.find()
      .populate("cabId")
      .populate("members");

    res.status(200).json(pools);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};




// import { Request, Response } from "express";
// import { RidePool } from "../models/ridePool.model";
// import { Cab } from "../models/cab.model";

// export const createTestPool = async (req: Request, res: Response) => {
//   try {
//     // Find one available cab
//     const cab = await Cab.findOne({ isAvailable: true });

//     if (!cab) {
//       return res.status(400).json({ message: "No available cab found" });
//     }

//     const pool = await RidePool.create({
//       cabId: cab._id,
//       members: [],
//       totalSeatsUsed: 0,
//       totalLuggageUsed: 0,
//       estimatedRouteDistanceKm: 0,
//     });

//     // Mark cab unavailable
//     cab.isAvailable = false;
//     cab.currentPoolId = pool._id as any;
//     await cab.save();

//     res.status(201).json(pool);
    
//   } catch (error: any) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// };
