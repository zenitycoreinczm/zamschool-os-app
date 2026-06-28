import type { Env, SessionSnapshot } from "./types.ts";

export interface RateLimitConfig {
  /** Sliding window size in seconds */
  windowSec: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** Edge rate-limit presets (KV-backed stubs; tune per route in production). */
export const GATEWAY_RATE_LIMITS = {
  default: { windowSec: 60, maxRequests: 120, keyPrefix: "default" },
  upload: { windowSec: 60, maxRequests: 20, keyPrefix: "upload" },
  read: { windowSec: 60, maxRequests: 120, keyPrefix: "read" },
  mutation: { windowSec: 60, maxRequests: 60, keyPrefix: "mutation" },
  anonymous: { windowSec: 60, maxRequests: 30, keyPrefix: "anonymous" },
} as const satisfies Record<string, RateLimitConfig>;

function isRateLimitEnabled(env: Env): boolean {
  return String(env.RATE_LIMIT_ENABLED || "").toLowerCase() === "true";
}

/**
 * KV fixed-window counter.
 * Returns allowed=true only when RATE_LIMIT_ENABLED is not "true".
 * When enabled, KV errors fail closed so Cloudflare protects the app and Supabase.
 */
export async function checkGatewayRateLimit(
  env: Env,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + config.windowSec * 1000;

  if (!isRateLimitEnabled(env)) {
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (!env.RATE_LIMITS) {
    console.error("[rate-limit] RATE_LIMIT_ENABLED=true but RATE_LIMITS KV binding is missing");
    return { allowed: false, remaining: 0, resetAt };
  }

  const key = `${config.keyPrefix}:${identifier}:${Math.floor(now / (config.windowSec * 1000))}`;

  try {
    const currentRaw = await env.RATE_LIMITS.get(key);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;

    if (current >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    await env.RATE_LIMITS.put(key, String(current + 1), {
      expirationTtl: config.windowSec + 5,
    });

    return {
      allowed: true,
      remaining: Math.max(config.maxRequests - current - 1, 0),
      resetAt,
    };
  } catch (err) {
    console.error("[rate-limit] KV check failed; blocking request", err);
    return { allowed: false, remaining: 0, resetAt };
  }
}

export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function resolveRateLimitKey(req: Request, session: SessionSnapshot | null): string {
  if (session) {
    return `${session.schoolId}:${session.userId}`;
  }

  const forwarded = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0]?.trim() || "unknown"}`;
  }

  return "ip:unknown";
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
  extraHeaders: Record<string, string>
): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: {
      ...extraHeaders,
      ...rateLimitHeaders(result, config),
    },
  });
}
