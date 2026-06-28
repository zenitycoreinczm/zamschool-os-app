/**
 * Approved Redis key prefixes (30MB free tier).
 * Anything outside these prefixes is rejected at runtime.
 */

export const REDIS_KEY_PREFIX = {
  rateLimit: "rl:",
  role: "role:",
  session: "sess:",
  temp: "tmp:",
  daily: "daily:",
  shell: "shell:",
  ws: "ws:",
} as const;

const ALLOWED_PREFIXES = Object.values(REDIS_KEY_PREFIX);

export function isApprovedRedisKey(key: string): boolean {
  const normalized = String(key || "").trim();
  if (!normalized || normalized.length > 200) return false;
  return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function roleCacheKey(userId: string) {
  return `${REDIS_KEY_PREFIX.role}${userId}`;
}

export function sessionMetaKey(userId: string) {
  return `${REDIS_KEY_PREFIX.session}${userId}`;
}

export function tempOtpThrottleKey(email: string) {
  return `${REDIS_KEY_PREFIX.temp}otp:throttle:${email.toLowerCase()}`;
}

export function tempTokenKey(kind: string, id: string) {
  return `${REDIS_KEY_PREFIX.temp}${kind}:${id}`;
}

export function rateLimitKey(scope: string, identifier: string) {
  return `${REDIS_KEY_PREFIX.rateLimit}${scope}:${identifier}`;
}

export function dailyUsageKey(feature: string, userId: string, day: string) {
  return `${REDIS_KEY_PREFIX.daily}${feature}:${userId}:${day}`;
}

export function shellCacheKey(userId: string, schoolId: string | null) {
  return `${REDIS_KEY_PREFIX.shell}${userId}:${schoolId || "none"}`;
}

export function workspaceCacheKey(userId: string, schoolId: string | null) {
  return `${REDIS_KEY_PREFIX.ws}${userId}:${schoolId || "none"}`;
}
