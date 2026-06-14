const KV_REST_API_URL = process.env.KV_REST_API_URL || '';
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || '';

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const LIMITS: Record<string, RateLimitConfig> = {
  api: { maxRequests: 100, windowMs: 60 * 1000 },
  auth: { maxRequests: 10, windowMs: 60 * 1000 },
  image_uploads: { maxRequests: 20, windowMs: 60 * 1000 },
  file_upload: { maxRequests: 20, windowMs: 60 * 1000 },
};

export function isKvConfigured(): boolean {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

async function kvGet(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${KV_REST_API_URL}/values/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function kvPut(key: string, value: string, expirationTtl?: number): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${KV_REST_API_TOKEN}` };
    if (expirationTtl) {
      headers['Expiration-TTL'] = String(expirationTtl);
    }
    const res = await fetch(`${KV_REST_API_URL}/values/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers,
      body: value,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

export async function checkKvRateLimit(
  identifier: string,
  category: keyof typeof LIMITS
): Promise<RateLimitResult> {
  if (!isKvConfigured()) {
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const config = LIMITS[category];
  if (!config) {
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const kvKey = `rate_limit:${category}:${identifier}:${windowStart}`;
  const ttl = Math.ceil(config.windowMs / 1000);

  try {
    const currentVal = await kvGet(kvKey);
    const count = currentVal ? parseInt(currentVal, 10) : 0;

    if (count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        reset: windowStart + config.windowMs,
      };
    }

    await kvPut(kvKey, String(count + 1), ttl);

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      reset: windowStart + config.windowMs,
    };
  } catch {
    return { allowed: true, remaining: 999, reset: 0 };
  }
}

export async function checkKvBurstLimit(
  userId: string,
  operation: string,
  maxConcurrent: number = 3
): Promise<{ allowed: boolean }> {
  if (!isKvConfigured()) {
    return { allowed: true };
  }

  const kvKey = `burst:${operation}:${userId}`;

  try {
    const currentVal = await kvGet(kvKey);
    const current = currentVal ? parseInt(currentVal, 10) : 0;

    if (current >= maxConcurrent) {
      return { allowed: false };
    }

    await kvPut(kvKey, String(current + 1), 60);
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function releaseKvBurstLimit(userId: string, operation: string): Promise<void> {
  if (!isKvConfigured()) return;

  const kvKey = `burst:${operation}:${userId}`;

  try {
    const currentVal = await kvGet(kvKey);
    const current = currentVal ? parseInt(currentVal, 10) : 0;
    if (current > 0) {
      await kvPut(kvKey, String(current - 1), 60);
    }
  } catch {
    // fail silently
  }
}
