import mongoose, { Schema, Document } from "mongoose";

export interface IRidePool extends Document {
  cabId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[]; // RideRequest IDs
  totalSeatsUsed: number;
  totalLuggageUsed: number;
  estimatedRouteDistanceKm: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}

const RidePoolSchema = new Schema<IRidePool>(
  {
    cabId: {
      type: Schema.Types.ObjectId,
      ref: "Cab",
      required: true,
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "RideRequest",
      },
    ],
    totalSeatsUsed: {
      type: Number,
      required: true,
      min: 0,
    },
    totalLuggageUsed: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedRouteDistanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch active pools
RidePoolSchema.index({ status: 1, createdAt: 1 });

export const RidePool = mongoose.model<IRidePool>(
  "RidePool",
  RidePoolSchema
);
