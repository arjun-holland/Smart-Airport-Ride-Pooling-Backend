# 🚖 Smart Airport Ride Pooling Backend

A scalable backend system that intelligently groups passengers into shared cabs while optimizing routes, pricing, and concurrency handling.

---

## 📌 Problem Statement

Build a Smart Airport Ride Pooling Backend System that:

- Groups passengers into shared cabs
- Respects seat and luggage constraints
- Minimizes total travel deviation
- Ensures no passenger exceeds detour tolerance
- Handles real-time cancellations
- Supports 10,000 concurrent users
- Handles 100 requests per second
- Maintains latency under 300ms

This project fulfills all mandatory implementation requirements with working backend code.

---

# 🏗️ Tech Stack

- **Node.js**
- **Express.js**
- **TypeScript**
- **MongoDB Atlas**
- **Redis (Upstash)**
- **Swagger (OpenAPI)**
- **Artillery (Load Testing)**

---

# 🏛️ High-Level Architecture

Client
↓
Express API Layer
↓
Service Layer (Business Logic)
↓
| MongoDB (Persistent Storage) |
| Redis (Distributed Locking) |


### Components

### Express
Handles routing, validation, middleware, and API documentation.

### MongoDB
Stores:
- RideRequests
- RidePools
- Cabs

Uses:
- Transactions
- Indexing
- Optimized queries

### Redis (Upstash)
Used for distributed locking to prevent race conditions during matching.

### Matching Engine
Implements:
- Capacity validation
- Travel deviation minimization
- Detour tolerance enforcement
- Dynamic pricing recalculation

---

# 🧠 Data Structures & Algorithm (DSA Approach)

## Ride Matching Algorithm

For each new ride request:

1. Fetch all ACTIVE ride pools
2. Validate:
   - Seat availability
   - Luggage availability
3. Calculate detour distance using Haversine formula
4. Ensure:
   - New rider tolerance not exceeded
   - Existing riders’ tolerance not exceeded
5. Choose pool with minimum incremental deviation
6. If none found → create new pool

---

## ⏱ Time Complexity

Let:
- **P** = number of active pools
- **K** = average riders per pool

Matching complexity:O(P × K)


- Pool scan → O(P)
- Tolerance check → O(K)
- Distance calculation → O(1)

Efficient for moderate pool sizes and horizontally scalable.

---

# 🔐 Concurrency Handling Strategy

## 1️⃣ MongoDB Transactions

Used to ensure atomic updates across:
- RideRequest
- RidePool
- Cab

Prevents partial updates and inconsistent state.

---

## 2️⃣ Redis Distributed Lock

Before modifying a pool:SET lock:pool:<id> NX EX 5


### Why?

Prevents race condition:

Without lock:
- Two requests read same pool
- Both see available seats
- Both assign ride
- Pool overbooks

Redis ensures:
- Only one request modifies a pool at a time.

This guarantees correctness under concurrent load.

---

# 🗄 Database Schema & Indexing Strategy

## RidePool Index

```ts
RidePoolSchema.index({ status: 1, createdAt: 1 });

Why?

Fast lookup of ACTIVE pools

Optimized matching query

Unique Constraint
vehicleNumber: { unique: true }


Prevents duplicate cab registrations.

Indexed Fields

status (frequent filtering)

cabId (lookup)

rideId (relations)

Indexes significantly reduce scan time during matching and cancellation.

💰 Dynamic Pricing Formula

Each ride price is calculated as:

Final Price =
BaseFare
+ (BaseDistance × PerKmRate)
+ (DetourDistance × DetourRate)
- PoolingDiscount

Pooling Discount
discount = min((poolSize - 1) × 10%, 30%)


This ensures:

Longer rides pay more

Riders benefit from pooling

Discount capped for revenue safety

Pricing recalculated when:

A ride joins a pool

A ride cancels

📊 Performance & Load Testing

Load tested using Artillery.

Test Configuration

100 Requests Per Second

50 seconds duration

Endpoint: POST /api/rides

Results

Total Requests: 5000

Failure Rate: 0%

Mean Latency: 76ms

p95: 113ms

p99: 162ms

✅ Meets requirement:

Sustained 100 RPS

<300ms latency

📘 API Documentation

Swagger UI available at:

http://localhost:5000/api-docs


Available APIs:

POST /api/rides → Create Ride

POST /api/cabs → Create Cab

POST /api/match/:rideId → Match Ride

POST /api/cancel/:rideId → Cancel Ride

GET /api/pools → Get All Pools

🚀 How To Run Locally
1️⃣ Clone Repository
git clone <your-repo-url>
cd smart-airport-ride-pooling-backend

2️⃣ Install Dependencies
npm install

3️⃣ Create .env File
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
REDIS_URL=your_redis_url

4️⃣ Seed Database
npm run seed

5️⃣ Start Development Server
npm run dev

6️⃣ Run Load Test
npm run load

📦 Project Structure
```
src/
 ├── config/
 ├── controllers/
 ├── middlewares/
 ├── models/
 ├── repositories/
 ├── routes/
 ├── services/
 ├── utils/
 ├── app.ts
 ├── server.ts
 └── seed.ts
```

📌 Assumptions

Greedy route insertion approach used.

Distance calculated using Haversine formula.

Route order approximated using last drop-off.

Horizontal scaling assumed for 10k concurrent users.

🏁 Conclusion

This backend system:

Implements intelligent ride pooling

Minimizes travel deviation
Enforces detour tolerance
Handles concurrency safely
Maintains performance under 100 RPS
Demonstrates production-ready backend architecture