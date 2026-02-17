import mongoose, { Schema, Document } from "mongoose";

export interface ICab extends Document {
  driverName: string;
  vehicleNumber: string;
  seatCapacity: number;
  luggageCapacity: number;
  isAvailable: boolean;
  currentPoolId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CabSchema = new Schema<ICab>(
  {
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seatCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    luggageCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentPoolId: {
      type: Schema.Types.ObjectId,
      ref: "RidePool",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for availability search
CabSchema.index({ isAvailable: 1, seatCapacity: 1 });

export const Cab = mongoose.model<ICab>("Cab", CabSchema);
