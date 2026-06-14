/**
 * Redis (free tier ~30MB) — server-only, approved use cases only.
 *
 * DO NOT use for: dashboards, student lists, attendance, exam data, or general API caching.
 * See lib/redis-keys.ts, docs/SUPABASE_PROTECTION_STRATEGY.md, and .env.example.
 *
 * ioredis is loaded dynamically so it is never bundled into client chunks.
 *
 * Server-side (Redis Cloud dashboard): maxmemory ~25mb, maxmemory-policy allkeys-lru.
 * The app always sets EX TTL on writes so LRU is a safety net, not the primary cleanup.
 */

import { isApprovedRedisKey } from "./redis-keys";
import { clampRedisTtl } from "./redis-ttl";

/* ─── Circuit Breaker ─── */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;
const MAX_HALF_OPEN_ATTEMPTS = 3;

let circuitState: CircuitState = "CLOSED";
let consecutiveFailures = 0;
let lastFailureTime = 0;
let halfOpenAttempts = 0;

function recordSuccess() {
  if (circuitState === "HALF_OPEN") {
    console.warn("[Redis] Circuit breaker: HALF_OPEN → CLOSED (recovered)");
    circuitState = "CLOSED";
    consecutiveFailures = 0;
    halfOpenAttempts = 0;
  } else if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
  }
}

function recordFailure() {
  consecutiveFailures++;
  lastFailureTime = Date.now();

  if (circuitState === "HALF_OPEN") {
    console.warn(
      `[Redis] Circuit breaker: HALF_OPEN → OPEN (failure ${consecutiveFailures})`
    );
    circuitState = "OPEN";
    halfOpenAttempts = 0;
  } else if (
    circuitState === "CLOSED" &&
    consecutiveFailures >= CIRCUIT_THRESHOLD
  ) {
    console.warn(
      `[Redis] Circuit breaker: CLOSED → OPEN after ${consecutiveFailures} failures`
    );
    circuitState = "OPEN";
  }
}

export function isRedisAvailable(): boolean {
  if (!isRedisConfigured()) return false;

  if (circuitState === "OPEN") {
    if (Date.now() - lastFailureTime >= CIRCUIT_COOLDOWN_MS) {
      console.warn("[Redis] Circuit breaker: OPEN → HALF_OPEN (testing recovery)");
      circuitState = "HALF_OPEN";
      consecutiveFailures = 0;
      halfOpenAttempts = 0;
      return true;
    }
    return false;
  }

  return true;
}

function shouldUseTls(redisUrl: string | undefined) {
  if (process.env.REDIS_TLS === "true") return true;
  if (process.env.REDIS_TLS === "false") return false;
  if (!redisUrl) return false;

  try {
    return new URL(redisUrl).protocol === "rediss:";
  } catch {
    return false;
  }
}

export function resolveRedisOptions(redisUrl: string | undefined) {
  const options: Record<string, unknown> = {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    connectTimeout: 10_000,
    lazyConnect: true,
    keepAlive: 30_000,
    retryStrategy: (times: number) => {
      const base = Math.min(Math.pow(2, times) * 100, 10_000);
      const jitter = Math.floor(Math.random() * 200);
      return base + jitter;
    },
  };

  if (shouldUseTls(redisUrl)) {
    options.tls = {};
  }

  return options;
}

let redisClient: import("ioredis").default | null = null;
let redisLoading = false;
let redisLoaded = false;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function getRedisClient(): Promise<import("ioredis").default | null> {
  if (typeof window !== "undefined") return null;
  if (!isRedisConfigured()) return null;
  if (!isRedisAvailable()) return null;
  if (redisLoaded) return redisClient;
  if (redisLoading) {
    while (redisLoading) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return redisClient;
  }

  redisLoading = true;
  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(process.env.REDIS_URL!, resolveRedisOptions(process.env.REDIS_URL));

    // Must connect explicitly when lazyConnect is true.
    await redisClient.connect();

    redisClient.on("error", (err: Error) => {
      console.error("[Redis]", err.message);
      if (
        err.message.includes("ECONNRESET") ||
        err.message.includes("ETIMEDOUT") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("max number of clients reached")
      ) {
        recordFailure();
      }
    });
    redisClient.on("end", () => {
      console.warn("[Redis] Connection ended");
      recordFailure();
    });
    redisLoaded = true;
    recordSuccess();
  } catch (err) {
    recordFailure();
    console.error("[Redis] Failed to initialize:", err);
    // Attempt to disconnect a partially-initialised client
    if (redisClient) {
      try { redisClient.disconnect(); } catch { /* ignore */ }
    }
    redisClient = null;
    redisLoaded = true;
  } finally {
    redisLoading = false;
  }

  return redisClient;
}

function assertKey(key: string) {
  if (!isApprovedRedisKey(key)) {
    throw new Error(`[Redis] Key not allowed (free-tier policy): ${key.slice(0, 80)}`);
  }
}

async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  fallback: T
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
  return withCircuitBreaker(() => redis.get(key), null);
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return false;
  return withCircuitBreaker(async () => {
    await redis.set(key, value, "EX", clampRedisTtl(ttlSeconds));
    return true;
  }, false);
}

export async function redisDel(key: string): Promise<void> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return;
  await withCircuitBreaker(() => redis.del(key), undefined);
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<boolean> {
  return redisSet(key, JSON.stringify(value), ttlSeconds);
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number | null> {
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

export async function redisExpire(key: string, ttlSeconds: number): Promise<void> {
  assertKey(key);
  const redis = await getRedisClient();
  if (!redis) return;
  await withCircuitBreaker(() => redis.expire(key, clampRedisTtl(ttlSeconds)), undefined);
}

/** Sliding-window rate limit (sorted set). */
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
    await redis.zremrangebyscore(params.key, 0, windowStart);
    const currentCount = await redis.zcard(params.key);

    if (currentCount >= params.maxRequests) {
      const oldest = await redis.zrange(params.key, 0, 0, "WITHSCORES");
      const resetTime =
        oldest.length > 1 ? Number(oldest[1]) + params.windowMs : now + params.windowMs;
      return { allowed: false, remaining: 0, resetTime };
    }

    await redis.zadd(params.key, now, `${now}-${Math.random()}`);
    await redis.pexpire(params.key, params.windowMs);

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
  await withCircuitBreaker(() => redis.decr(key), undefined);
}