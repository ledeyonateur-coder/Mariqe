import { Redis } from "@upstash/redis";

// Tracks units sold per product, on top of the static `Product.stock` in
// data/products.ts. Effective stock = product.stock - getSoldQuantity(id).
//
// Uses Upstash Redis (Vercel Marketplace "Redis" integration auto-injects
// KV_REST_API_URL / KV_REST_API_TOKEN, and Upstash's own dashboard exposes
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — either works).
// Falls back to an in-memory Map when neither is configured: this still
// blocks a second purchase within the same warm server instance, but does
// NOT survive a cold start or hold across multiple instances. Configure
// Redis for a real, persistent guarantee.

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const SOLD_QTY_KEY = "mariqe:sold-qty";
const memoryStore = new Map<string, number>();

export async function getSoldQuantities(): Promise<Record<string, number>> {
  if (redis) {
    const raw = await redis.hgetall<Record<string, number>>(SOLD_QTY_KEY);
    if (!raw) return {};
    return Object.fromEntries(Object.entries(raw).map(([id, qty]) => [id, Number(qty) || 0]));
  }
  return Object.fromEntries(memoryStore);
}

export async function getSoldQuantity(productId: string): Promise<number> {
  if (redis) {
    const value = await redis.hget<number>(SOLD_QTY_KEY, productId);
    return Number(value) || 0;
  }
  return memoryStore.get(productId) ?? 0;
}

export async function addSoldQuantity(productId: string, quantity: number): Promise<void> {
  if (quantity <= 0) return;
  if (redis) {
    await redis.hincrby(SOLD_QTY_KEY, productId, quantity);
    return;
  }
  memoryStore.set(productId, (memoryStore.get(productId) ?? 0) + quantity);
}
