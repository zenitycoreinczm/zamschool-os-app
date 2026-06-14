# 07 — Replace Redis with Cloudflare KV for Rate Limiting

## Motivation

Current `lib/rate-limit.ts` uses Redis (ioredis). Cloudflare KV can replace Redis for this use case:
- Eliminates Redis hosting cost
- Globally distributed (lower latency for edge requests)
- Simpler infrastructure

## Caveats

KV has **eventual consistency** (up to 60s propagation). For rate limiting, this means a user could occasionally exceed the limit by a small margin. Acceptable for this application.

KV also has a **1 MB value size limit** and **1000 writes/second** per namespace — well within the needs of a school management system.

## Implementation

### `lib/kv-client.ts`

```typescript
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const limits: Record<string, RateLimitConfig> = {
  api: { maxRequests: 100, windowMs: 60 * 1000 },
  auth: { maxRequests: 10, windowMs: 60 * 1000 },
  image_uploads: { maxRequests: 20, windowMs: 60 * 1000 },
  file_upload: { maxRequests: 20, windowMs: 60 * 1000 },
};

export async function checkKvRateLimit(
  identifier: string,
  category: keyof typeof limits
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return { allowed: true, remaining: 999, reset: 0 }; // fallback: allow all
  }

  const config = limits[category];
  const key = `rate_limit:${category}:${identifier}`;
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const kvKey = `${key}:${windowStart}`;

  try {
    // Get current count
    const res = await fetch(`${KV_REST_API_URL}/values/${kvKey}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });

    let count = 0;
    if (res.ok) {
      const value = await res.text();
      count = parseInt(value, 10) || 0;
    }

    if (count >= config.maxRequests) {
      return { allowed: false, remaining: 0, reset: windowStart + config.windowMs };
    }

    // Increment
    await fetch(`${KV_REST_API_URL}/values/${kvKey}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: String(count + 1),
    });

    return { allowed: true, remaining: config.maxRequests - count - 1, reset: windowStart + config.windowMs };
  } catch {
    return { allowed: true, remaining: 999, reset: 0 }; // fail open
  }
}
```

### Update `lib/rate-limit.ts`

Add KV as a provider alongside Redis. Try KV first, fall back to Redis, then in-memory:

```typescript
export async function checkRateLimit(
  identifier: string,
  category: keyof typeof rateLimitConfig
): Promise<RateLimitResult> {
  // Try KV first
  if (process.env.KV_REST_API_URL) {
    const result = await checkKvRateLimit(identifier, category);
    if (result.allowed || process.env.REDIS_URL) return result;
  }
  // Fall back to Redis
  if (redis) {
    return checkRedisRateLimit(identifier, category);
  }
  // Last resort: in-memory
  return checkInMemoryRateLimit(identifier, category);
}
```

## Environment Variables

```env
# KV (replaces Redis for rate limiting)
KV_REST_API_URL=https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/storage/kv/namespaces/<NAMESPACE_ID>/values
KV_REST_API_TOKEN=your-kv-api-token
```

## Configuration

Create the KV namespace in your Cloudflare dashboard or via wrangler:

```bash
npx wrangler kv:namespace create "RATE_LIMITS"
```
