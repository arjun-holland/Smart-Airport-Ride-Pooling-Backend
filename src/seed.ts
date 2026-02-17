//import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { Cab } from "./models/cab.model";
import { RideRequest } from "./models/rideRequest.model";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    console.log("Clearing existing data...");

    await Cab.deleteMany({});
    await RideRequest.deleteMany({});

    console.log("Inserting sample cabs...");

    await Cab.insertMany([
      {
        driverName: "Ramesh",
        vehicleNumber: "TS09AB1234",
        seatCapacity: 4,
        luggageCapacity: 6,
      },
      {
        driverName: "Suresh",
        vehicleNumber: "TS09CD5678",
        seatCapacity: 4,
        luggageCapacity: 5,
      },
      {
        driverName: "Mahesh",
        vehicleNumber: "TS09EF9101",
        seatCapacity: 6,
        luggageCapacity: 8,
      },
       {
        driverName: "Krishna",
        vehicleNumber: "AP09EF9101",
        seatCapacity: 10,
        luggageCapacity: 20,
      },
    ]);

    console.log("Seed completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();
