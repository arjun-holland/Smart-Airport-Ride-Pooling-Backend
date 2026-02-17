import { Request, Response } from "express";
import { cancelRide } from "../services/cancellation.service";

export const cancelRideController = async (req: Request, res: Response) => {
  try {
    const  rideId  = req.params.rideId as string;
    const result = await cancelRide(rideId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
