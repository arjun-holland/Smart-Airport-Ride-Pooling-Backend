import Redis from "ioredis";

let redis: Redis;

export const connectRedis = async () => {
  redis = new Redis(process.env.REDIS_URL!, {
    tls: {},
  });

  redis.on("connect", () => {
    console.log("Redis Connected");
  });

  redis.on("error", (err) => {
    console.error("Redis Error:", err);
  });

  await redis.ping();
};

export const getRedis = () => {
  if (!redis) throw new Error("Redis not initialized");
  return redis;
};
