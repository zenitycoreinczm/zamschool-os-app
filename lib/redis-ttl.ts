/**
 * TTL defaults for Redis free tier (~25–30MB, allkeys-lru on the server).
 * Every Redis SET must use one of these — keys expire automatically.
 */

export const REDIS_TTL = {
  /** Sliding-window rate limit keys (pexpire = window length). */
  rateLimitWindowMs: 60_000,
  rateLimitBurstSec: 60,

  /** Role / permission cache (API routes). */
  roleSec: 15 * 60,

  /** Active session metadata (not Supabase JWT). */
  sessionSec: 7 * 24 * 60 * 60,

  /** OTP send throttle per email. */
  otpThrottleSec: 60 * 60,

  /** Password reset / verify / invite token payloads. */
  tempTokenSec: 10 * 60,

  /** Daily usage counters (until UTC midnight). */
  dailyUsageMaxSec: 48 * 60 * 60,

  /** Consolidated shell response (workspace + unread + role shell). */
  shellSec: 30,

  /** Dashboard summary cache per role. */
  dashboardSec: 30,

  /** Workspace context stable slice (school name, term, profile). */
  workspaceSec: 45,

  /** Hard cap for any application-chosen TTL. */
  maxKeySec: 30 * 24 * 60 * 60,
} as const;

export function clampRedisTtl(seconds: number): number {
  return Math.max(1, Math.min(Math.floor(seconds), REDIS_TTL.maxKeySec));
}