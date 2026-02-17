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


