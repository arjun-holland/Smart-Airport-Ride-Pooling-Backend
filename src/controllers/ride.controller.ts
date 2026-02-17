import { Request, Response } from "express";
import { RideRequest } from "../models/rideRequest.model";

export const createRide = async (req: Request, res: Response) => {
  try {
    const {passengerName,passengerPhone,source,destination,luggageCount,seatRequired,detourToleranceKm,baseDistanceKm} = req.body;

    if (!passengerName || !passengerPhone || !source || !destination || luggageCount === undefined || seatRequired === undefined || detourToleranceKm === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ride = await RideRequest.create({passengerName,passengerPhone,source,destination,luggageCount,seatRequired,detourToleranceKm,baseDistanceKm: baseDistanceKm ?? 10,});  // default fallback

    res.status(201).json(ride);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
