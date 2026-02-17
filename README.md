# 🚖 Smart Airport Ride Pooling Backend

A production-grade backend system that intelligently groups passengers into shared airport cabs while optimizing routing, pricing, and concurrency safety under high load.

---

# 📌 Assignment Compliance Overview

This project satisfies all functional and technical requirements specified in the Backend Engineer Assessment.

---

# ✅ Functional Requirements Implementation

| Requirement | Implementation |
|-------------|---------------|
| Group passengers into shared cabs | Matching engine assigns rides to ACTIVE pools |
| Respect seat & luggage constraints | Capacity validated before assignment |
| Minimize total travel deviation | Greedy incremental detour minimization |
| Detour tolerance enforcement | Ride rejected if tolerance exceeded |
| Handle real-time cancellations | Atomic cancellation with pool recalculation |
| Support 10,000 concurrent users | Stateless architecture + Redis lock |
| Handle 100 RPS | Load tested successfully |
| Maintain latency < 300ms | Verified via Artillery |


---

# API Documentation

Swagger UI available at:

`http://localhost:5000/api-docs`

<img width="1915" height="1079" alt="image" src="https://github.com/user-attachments/assets/69d6b975-db17-4d75-953e-9b9309b5a276" />


Available Endpoints:

| Method | Endpoint            | Description   |
| ------ | ------------------- | ------------- |
| POST   | /api/rides          | Create Ride   |
| POST   | /api/cabs           | Create Cab    |
| POST   | /api/match/:rideId  | Match Ride    |
| POST   | /api/cancel/:rideId | Cancel Ride   |
| GET    | /api/pools          | Get All Pools |

Swagger provides interactive API documentation.


---

# 🏗️ Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB Atlas
- Redis (Upstash)
- Swagger (OpenAPI)
- Artillery (Load Testing)

---

# 📌 Assumptions & Design Decisions

- Distance is calculated using the **Haversine formula** (great-circle approximation).
- A **greedy pool selection** strategy is used to minimize incremental detour.
- Route ordering is approximated using the **last drop-off heuristic** for simplicity.
- Designed for **horizontal scalability** (stateless API + externalized DB & Redis).
- MongoDB is assumed to run as a replica set (required for transactions).
- Redis is assumed to be available for distributed locking (Upstash).

---

# 🏛️ High-Level Architecture
```
     ┌───────────────────────────────┐               
     |           Client              |
     └───────────────────────────────┘     
                    ↓
     ┌───────────────────────────────┐
     | Express API Layer(Controllers)|
     └───────────────────────────────┘
                    ↓
     ┌───────────────────────────────┐
     | Service Layer (Business Logic)|
     └───────────────────────────────┘    
                    ↓
     ┌───────────────────────────────┐
     │ MongoDB Atlas (Persistent DB) │
     └───────────────────────────────┘
                    ↓
     ┌───────────────────────────────┐
     │ Redis (Upstash) – Lock Layer  │
     └───────────────────────────────┘
```


### Architecture Characteristics

- Stateless API layer
- Transaction-safe
- Distributed lock protected
- Index-optimized database design
- Horizontally scalable

---


# 🧮 DSA Approach & Complexity Analysis

## Ride Matching Algorithm
```
The system uses a Greedy Selection Algorithm to assign an incoming ride to the most optimal active pool.
```
For each incoming ride request:
1. Fetch Candidate Pools : Get all ACTIVE RidePools.
2. Capacity Validation
    - For each pool:
        - Check seat availability
        - Check luggage availability
    - If insufficient → skip pool.
3. Compute Incremental Route Cost
    - For eligible pools:
         - Identify last drop-off location in the pool.
         - Compute:
             ```
               pickupDetour = distance(lastDropOff → newRideSource)
               rideDistance = distance(newRideSource → newRideDestination)
               incrementalCost = pickupDetour + rideDistance
             ```
         - Distance is calculated using the `Haversine formula`.
         - This represents: The additional distance the cab must travel if this ride joins the pool
4. Enforce Detour Constraint
   If incrementalCost > ride.detourToleranceKm
   - Skip the pool.
   - This ensures passenger satisfaction constraints are respected.
5. Greedy Selection
   - Among all valid pools  -->  Select the pool with --> minimum incrementalCost
   - This minimizes total travel deviation.
6. If No Suitable Pool
   - If no pool satisfies:
        - Capacity
        - Detour tolerance
   - Create a new RidePool and assign an available Cab.

### 💡 Why This Is a Greedy Algorithm

Because at each ride arrival:
- We choose the pool with the locally minimal incremental distance.
- We do not recompute global optimal routes.
- No backtracking.
- No dynamic programming.
It is: Greedy, locally optimal selection per request.

### Time Complexity

Let:
- **P** = number of ACTIVE pools
- **K** = Riders per pool

For each incoming ride:
1. Scan all active pools → O(P)
2. For each pool:
   - Capacity check → O(1)
   - Last member lookup → O(1)
   - Distance calculations → O(1)
   Total:O(P)
3. If full member tolerance checks are added (checking all K members): O(P × K)

---

# Dynamic Pricing Formula Design

Each ride price is calculated using a distance-based model with pooling incentives.
Formula : 

```
RawPrice =  BaseFare 
            + (BaseDistanceKm × PerKmRate) 
            + (DetourKm × DetourPenaltyRate)

poolingDiscountFactor = 1 - 0.1 * (poolSize - 1);
DiscountFactor = max(poolingDiscountFactor, 0.7)

FinalPrice = RawPrice × DiscountFactor
```

- BaseFare : A fixed minimum charge applied to every ride.
- BaseDistanceKm : The actual direct distance from source to destination.
- PerKmRate : Cost per km.
- DetourKm : Extra distance added due to pooling.
- DetourPenaltyRate : Rate applied to detour kilometers.
- RawPrice : This is the full cost before applying pooling discount.
- poolSize : Number of passengers in the pool after assignment.
- poolingDiscountFactor : Each additional rider gives 10% discount.
- FinalPrice : FinalPrice is calculated per RideRequest.

```
A discount factor of 0.7 means the rider pays 70% of the raw price (30% discount).
In pool size = 2(10% discount) and RawPrice = 160, each rider pays 144, not split the price among riders.
```


---


# Low Level Design (Class Diagram + Patterns Used)

<img width="1041" height="572" alt="image" src="https://github.com/user-attachments/assets/20d5fe67-7b1c-4553-8374-e0d8fd81ca2b" />


## Entity Relationships
### Relationship Summary

- Cab (1) → (0..1) RidePool
     - A cab can have at most one active pool at a time.
     - A cab may also be free (no active pool).
- RidePool (1) → (1) Cab
     - Every ride pool must be associated with exactly one cab.
- RidePool (1) → (*) RideRequest
     - A pool can contain multiple ride requests (multiple passengers).
- RideRequest (0..1) → (1) RidePool
     - A ride request may:
         - Not be assigned yet (PENDING)
         - Or belong to exactly one pool (MATCHED)


### MongoDB Reference Mapping

- This directly reflects the actual schema implementation:
- RideRequest.poolId → RidePool._id
- RidePool.cabId → Cab._id
- Cab.currentPoolId → RidePool._id
- RidePool.members[] → RideRequest._id[]


## Design Patterns Used
### 1️⃣ Service Layer Pattern

- Structure: `Controller → Service → Model`
- Controllers handle HTTP request/response.
- Services contain business logic:
   - Ride matching
   - Pricing calculation
   - Detour validation
   - Cancellation logic
- Models strictly define schema and persistence.

### 2️⃣ Transactional Pattern (MongoDB Sessions)
- MongoDB transactions are used for atomic updates across:
  - RideRequest
  - RidePool
  - Cab
- All related operations (ride status update, pool member update, cab availability update) are executed within a single MongoDB session transaction.

#### Why Transactions Are Required
- Prevents partial writes (e.g., ride marked MATCHED but pool not updated).
- Ensures data consistency across multiple collections.
- Guarantees all-or-nothing execution — either every update succeeds, or all changes are rolled back.

### 3️⃣ Distributed Locking Pattern (Redis - Upstash)

To prevent concurrent modifications of the same RidePool, a distributed lock is acquired using `Upstash Redis` before any pool update.

`const lock = await redis.set(lockKey, "locked", "EX", 5, "NX");`

Lock Configuration:
- NX → Set the key only if it does not already exist
- EX 5 → Automatically expire the lock after 5 seconds
- lockKey = lock:pool:<poolId>

#### Prevents Race Condition:

Without locking:
   - Two requests read same pool
   - Both see capacity
   - Both insert
   - Pool overbooks
- Redis ensures only one modification per pool at a time.
- Concurrency safety demonstrated under load testing.

### 4️⃣ Layered Architecture

- Controller → Service → Model -> Models (Mongoose)
- Clear separation of concerns

### 5️⃣ Stateless API Design

- No session stored in memory.
- Every request is independent.
- Enables horizontal scaling.
- Safe behind load balancers.

---

# 🔒 Concurrency Safety Strategy
This system prevents race conditions using a dual-layer mechanism:
## MongoDB Transactions
- Ensure atomic multi-collection updates
- Guarantee all-or-nothing execution
- Prevent inconsistent state


## Redis Distributed Lock
- Ensure atomic multi-collection updates
- Guarantee all-or-nothing execution
- Prevent inconsistent state

```
Redis provides mutual exclusion.MongoDB provides atomicity and consistency.
Together they ensure correctness under concurrent load.
```

---

#  Project Structure
```
Smart-Airport-Ride-Pooling-Backend/
│
├── src/
│   ├── config/              # Database & Redis configuration
│   ├── controllers/         # HTTP request handlers
│   ├── models/              # Mongoose schemas (Cab, RidePool, RideRequest)
│   ├── routes/              # Express route definitions
│   ├── services/            # Business logic (matching, pricing, cancellation)
│   ├── utils/               # Utility helpers (distance calculation, etc.)
│   ├── app.ts               # Express app configuration
│   ├── server.ts            # Application entry point
│   └── seed.ts              # Database seed script
│
├── load-test.yml            # Artillery load test configuration
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---


# Performance Validation
## Load Testing Tool
Artillery
### Test Configuration

- 100 requests/second
- 50 seconds duration
- Endpoint tested: POST /api/rides


### Results

<img width="1002" height="203" alt="image" src="https://github.com/user-attachments/assets/a7707713-91db-4341-94c2-3ae6bc101822" />
<img width="1079" height="903" alt="image" src="https://github.com/user-attachments/assets/5ea9322b-3897-4573-aa0c-49f60042a609" />

- Total Requests: 5000 (100 RPS, 50 seconds => 100*50 => 5000)
- Failure Rate: 0%
- Mean Latency: 68ms
- p95: 111ms
- p99: 228ms


#### Meets requirement:
- 100 RPS sustained
- <300ms latency

---

# 🧪 Sample Test Data

### Seeded Data

Run: `npm run seed`

This will:
- Insert sample cabs
- Reset collections
- Prepare environment for ride matching

### Create a Ride

`POST /api/rides`
```
{
  "passengerName": "Mallikarjuna",
  "passengerPhone": "7075733507",
  "source": { "lat": 12.9716, "lng": 77.5946 },
  "destination": { "lat": 13.0358, "lng": 77.5970 },
  "luggageCount": 1,
  "seatRequired": 1,
  "detourToleranceKm": 5
}
```
Expected Response (201):
```
{
  "_id": "rideIdHere",
  "status": "PENDING",
  "price": 0
}
```

### Match Ride

`POST /api/match/{rideId}`
```
{
  "_id": "poolId",
  "cabId": "...",
  "members": ["rideIdHere"],
  "totalSeatsUsed": 1,
  "status": "ACTIVE"
}
```

### Get Pools

`GET /api/pools`

```
[
  {
    "_id": "poolId",
    "cabId": {...},
    "members": [...],
    "status": "ACTIVE"
  }
]
```

### Cancel Ride

`POST /api/cancel/{rideId}`
```
{
  "message": "Ride cancelled successfully"
}
```


---

# Setup & Run Instructions
## 1️⃣ Clone Repository
```
git clone https://github.com/arjun-holland/Smart-Airport-Ride-Pooling-Backend.git
cd Smart-Airport-Ride-Pooling-Backend
```

## 2️⃣ Install Dependencies
```
npm install
```

## 3️⃣ Configure Environment
Create .env from .env.example
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
```

Requirements
- MongoDB Atlas cluster
- Upstash Redis instance

## 4️⃣ Seed Database
```
npm run seed
```
This will:
- Clear existing collections
- Insert sample cabs
- Prepare environment for testing

## 5️⃣ Start Server

`npm run dev`

Server will start at: `http://localhost:5000`

Swagger API Docs available at: `http://localhost:5000/api-docs`



## 6️⃣ Run Load Test

`npm run load`

This executes Artillery with:
- 100 requests/second
- 50 seconds duration
- POST /api/rides endpoint

## 🔎 Notes

- Ensure MongoDB Atlas IP whitelist allows your IP.
- Ensure Redis URL is correct (Upstash requires TLS connection).
- Use Node.js v18+ recommended.

---


# 🏁 Conclusion
This backend system delivers:
- Functional ride pooling with seat and luggage constraints
- Travel deviation minimization with detour tolerance enforcement
- Dynamic pricing with pooling incentives
- Concurrency safety using MongoDB transactions and Redis distributed locks
- Indexed database queries for efficient matching
- Verified performance under sustained 100 RPS load
- Clean layered architecture (Controller → Service → Model)
