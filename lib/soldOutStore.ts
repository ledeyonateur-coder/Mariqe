import { Redis } from "@upstash/redis";

// Persists automatic sold-out state once a Stripe payment actually completes,
// on top of the manual `Product.soldOut` flag in data/products.ts.
//
// Uses Upstash Redis (Vercel Marketplace "Redis" integration auto-injects
// KV_REST_API_URL / KV_REST_API_TOKEN, and Upstash's own dashboard exposes
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — either works).
// Falls back to an in-memory Set when neither is configured: this still
// blocks a second purchase within the same warm server instance, but does
// NOT survive a cold start or hold across multiple instances. Configure
// Redis for a real, persistent guarantee.

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const SOLD_OUT_KEY = "mariqe:sold-out";
const memoryStore = new Set<string>();

export async function getSoldOutIds(): Promise<string[]> {
  if (redis) return redis.smembers(SOLD_OUT_KEY);
  return Array.from(memoryStore);
}

export async function isSoldOut(productId: string): Promise<boolean> {
  if (redis) return (await redis.sismember(SOLD_OUT_KEY, productId)) === 1;
  return memoryStore.has(productId);
}

export async function markSoldOut(productId: string): Promise<void> {
  if (redis) {
    await redis.sadd(SOLD_OUT_KEY, productId);
    return;
  }
  memoryStore.add(productId);
}
