import mongoose, { Schema, Document } from "mongoose";

export interface IRideRequest extends Document {
  passengerName: string;
  passengerPhone: string;
  source: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  price: number;
  baseDistanceKm?: number;
  luggageCount: number;
  seatRequired: number;
  detourToleranceKm: number;
  status: "PENDING" | "MATCHED" | "CANCELLED";
  poolId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const RideRequestSchema = new Schema<IRideRequest>(
  {
    passengerName: {
      type: String,
      required: true,
      trim: true,
    },
    passengerPhone: {
      type: String,
      required: true,
    },
    source: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    destination: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    luggageCount: {
      type: Number,
      required: true,
      min: 0,
    },
    seatRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      default: 0,
    },
    baseDistanceKm: {
      type: Number,
      required: false,
      default: 10,
    },
    detourToleranceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "MATCHED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    poolId: {
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

// Compound index for fast matching queries
RideRequestSchema.index({ status: 1, createdAt: 1 });

export const RideRequest = mongoose.model<IRideRequest>(
  "RideRequest",
  RideRequestSchema
);
