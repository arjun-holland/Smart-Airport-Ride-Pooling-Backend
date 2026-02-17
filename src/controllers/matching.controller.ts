import { Request, Response } from "express";
import { matchRideToPool } from "../services/matching.service";

export const matchRide = async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;

    const pool = await matchRideToPool(rideId);

    res.status(200).json(pool);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
