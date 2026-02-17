import { Request, Response } from "express";
import { Cab } from "../models/cab.model";

export const createCab = async (req: Request, res: Response) => {
  try {
    const { driverName, vehicleNumber, seatCapacity, luggageCapacity } = req.body;

    if (!driverName || !vehicleNumber || !seatCapacity || !luggageCapacity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const cab = await Cab.create({
      driverName,
      vehicleNumber,
      seatCapacity,
      luggageCapacity,
    });

    res.status(201).json(cab);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
