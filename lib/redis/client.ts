/**
 * Upstash Redis (REST API) — server-only, approved use cases only.
 *
 * DO NOT use for: dashboards, student lists, attendance, exam data, or general API caching.
 * See lib/redis/keys.ts, lib/supabase-protection.ts (TTL/dev-bucket policy), and .env.example.
 *
 * Uses @upstash/redis which communicates over HTTP — no persistent TCP connections.
 * This avoids connection-exhaustion issues on Vercel serverless.
 *
 * Upstash free tier: 10,000 commands/day, 256MB storage.
 * The app always sets EX TTL on writes so keys expire automatically.
 */

import { isApprovedRedisKey } from "@/lib/redis/keys";
import { clampRedisTtl } from "@/lib/redis/ttl";

/* ─── Circuit Breaker ─── */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

let circuitState: CircuitState = "CLOSED";
let consecutiveFailures = 0;
let lastFailureTime = 0;

function recordSuccess() {
  if (circuitState === "HALF_OPEN") {
    console.warn("[Redis] Circuit breaker: HALF_OPEN → CLOSED (recovered)");
    circuitState = "CLOSED";
    consecutiveFailures = 0;
  } else if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
  }
}

function recordFailure() {
  consecutiveFailures++;
  lastFailureTime = Date.now();

  if (circuitState === "CLOSED" && consecutiveFailures >= CIRCUIT_THRESHOLD) {
    console.warn(
      `[Redis] Circuit breaker: CLOSED → OPEN after ${consecutiveFailures} failures`,
    );
    circuitState = "OPEN";
  }
}

export function isRedisAvailable(): boolean {
  if (!isRedisConfigured()) return false;

  if (circuitState === "OPEN") {
    if (Date.now() - lastFailureTime >= CIRCUIT_COOLDOWN_MS) {
      console.warn(
        "[Redis] Circuit breaker: OPEN → HALF_OPEN (testing recovery)",
      );
      circuitState = "HALF_OPEN";
      consecutiveFailures = 0;
      return true;
    }
    return false;
  }

  return true;
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let redisClient: import("@upstash/redis").Redis | null = null;

async function getRedisClient(): Promise<
  import("@upstash/redis").Redis | null
> {
  if (typeof window !== "undefined") return null;
  if (!isRedisConfigured()) return null;
  if (!isRedisAvailable()) return null;
  if (redisClient) return redisClient;

  try {
    const { Redis } = await import("@upstash/redis");
    // fromEnv() reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    // Built-in: 5 retries with exponential backoff, auto-pipelining enabled
    redisClient = Redis.fromEnv();
    recordSuccess();
  } catch (err) {
    recordFailure();
    console.error("[Redis] Failed to initialize:", err);
    redisClient = null;
  }

  return redisClient;
}

function assertKey(key: string) {
  if (!isApprovedRedisKey(key)) {
    throw new Error(
      `[Redis] Key not allowed (free-tier policy): ${key.slice(0, 80)}`,
    );
  }
}

async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isRedisAvailable()) return fallback;
  try {
    const result = await operation();
    recordSuccess();
    return result;
  } catch (err) {
    console.error("[Redis] Operation error:", err);
    recordFailure();
    return fallback;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return null;
  return withCircuitBreaker(async () => {
    const val = await redis.get<string>(key);
    return val !== null && val !== undefined ? String(val) : null;
  }, null);
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return false;
  return withCircuitBreaker(async () => {
    await redis.setex(key, clampRedisTtl(ttlSeconds), value);
    return true;
  }, false);
}

export async function redisDel(key: string): Promise<void> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return;
  await withCircuitBreaker(() => redis.del(key).then(() => {}), undefined);
}

/** Get JSON — SDK auto-deserializes objects, arrays, numbers, booleans. */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return null;
  return withCircuitBreaker(async () => {
    const val = await redis.get<T>(key);
    return val ?? null;
  }, null);
}

/** Set JSON — SDK auto-serializes objects, arrays, numbers, booleans. */
export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<boolean> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return false;
  return withCircuitBreaker(async () => {
    await redis.set(key, value, { ex: clampRedisTtl(ttlSeconds) });
    return true;
  }, false);
}

export async function redisIncr(
  key: string,
  ttlSeconds?: number,
): Promise<number | null> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return null;
  return withCircuitBreaker(async () => {
    const count = await redis.incr(key);
    if (count === 1 && ttlSeconds) {
      await redis.expire(key, clampRedisTtl(ttlSeconds));
    }
    return count;
  }, null);
}

export async function redisExpire(
  key: string,
  ttlSeconds: number,
): Promise<void> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return;
  await withCircuitBreaker(
    () => redis.expire(key, clampRedisTtl(ttlSeconds)).then(() => {}),
    undefined,
  );
}

/** Sliding-window rate limit (sorted set) — official Upstash pattern. */
export async function redisSlidingWindowHit(params: {
  key: string;
  windowMs: number;
  maxRequests: number;
}): Promise<{ allowed: boolean; remaining: number; resetTime: number } | null> {
  assertKey(params.key);
  const redis = await getRedisClient();
  if (!redis) return null;

  const now = Date.now();
  const windowStart = now - params.windowMs;

  return withCircuitBreaker(async () => {
    // Pipeline: batch zremrangebyscore + zcard in 1 HTTP request
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(params.key, 0, windowStart);
    pipeline.zcard(params.key);
    const results = await pipeline.exec();

    const currentCount = Number(results[1]) || 0;

    if (currentCount >= params.maxRequests) {
      // Get oldest entry to calculate reset time
      // @upstash/redis withScores returns flat array: [member, score, member, score, ...]
      const oldest = await redis.zrange(params.key, 0, 0, { withScores: true });
      const resetTime =
        oldest.length > 1
          ? Number(oldest[1]) + params.windowMs
          : now + params.windowMs;
      return { allowed: false, remaining: 0, resetTime };
    }

    // Pipeline: add current request + set expiry in 1 HTTP request
    const addPipeline = redis.pipeline();
    addPipeline.zadd(params.key, {
      score: now,
      member: `${now}-${Math.random()}`,
    });
    addPipeline.pexpire(params.key, params.windowMs);
    await addPipeline.exec();

    return {
      allowed: true,
      remaining: params.maxRequests - currentCount - 1,
      resetTime: now + params.windowMs,
    };
  }, null);
}

export async function redisDecr(key: string): Promise<void> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return;
  await withCircuitBreaker(() => redis.decr(key).then(() => {}), undefined);
}
