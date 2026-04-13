import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const kv = new Redis(redisUrl);

// Helper to mimic Upstash/Vercel KV's simple get/set if needed, 
// though ioredis has them natively.
export const redis = kv;
