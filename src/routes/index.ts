import { Router } from "express";
import { createRide } from "../controllers/ride.controller";
import { createCab } from "../controllers/cab.controller";
import { getAllPools } from "../controllers/pool.controller";
import { matchRide } from "../controllers/matching.controller";
import { cancelRideController } from "../controllers/cancellation.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ride Pooling
 *   description: Smart Airport Ride Pooling APIs
 */

/**
 * @swagger
 * /api/rides:
 *   post:
 *     summary: Create a new ride request
 *     tags: [Ride Pooling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengerName:
 *                 type: string
 *               passengerPhone:
 *                 type: string
 *               source:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               luggageCount:
 *                 type: number
 *               seatRequired:
 *                 type: number
 *               detourToleranceKm:
 *                 type: number
 *               baseDistanceKm:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ride created successfully
 */
router.post("/rides", createRide);

/**
 * @swagger
 * /api/cabs:
 *   post:
 *     summary: Create a new cab
 *     tags: [Ride Pooling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driverName:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *               seatCapacity:
 *                 type: number
 *               luggageCapacity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Cab created successfully
*/
router.post("/cabs", createCab);

/**
 * @swagger
 * /api/match/{rideId}:
 *   post:
 *     summary: Match a ride request to the best available pool
 *     tags: [Ride Pooling]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB RideRequest ID
 *     responses:
 *       200:
 *         description: Ride matched successfully
 *       400:
 *         description: Matching failed
 */
router.post("/match/:rideId", matchRide);

/**
 * @swagger
 * /api/pools:
 *   get:
 *     summary: Get all ride pools
 *     tags: [Ride Pooling]
 *     responses:
 *       200:
 *         description: List of pools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   cabId:
 *                     type: string
 *                   totalSeatsUsed:
 *                     type: number
 *                   totalLuggageUsed:
 *                     type: number
 *                   status:
 *                     type: string
 */
router.get("/pools", getAllPools);

/**
 * @swagger
 * /api/cancel/{rideId}:
 *   post:
 *     summary: Cancel an existing ride request
 *     tags: [Ride Pooling]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB RideRequest ID
 *     responses:
 *       200:
 *         description: Ride cancelled successfully
 *       400:
 *         description: Cancellation failed
 */
router.post("/cancel/:rideId", cancelRideController);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Ride Pooling]
 *     responses:
 *       200:
 *         description: API is running
 */
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

export default router;
