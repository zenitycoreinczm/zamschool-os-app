export const DEFAULT_AUTH_RETRY_SECONDS = 30;
/** Supabase rate limits typically last 15-30 minutes. Use 15 min as default. */
export const SUPABASE_RATE_LIMIT_DEFAULT_SECONDS = 900;

type AuthRateLimitErrorLike = {
  message?: string | null;
  status?: number | string | null;
  retryAfterSeconds?: number | string | null;
  retry_after?: number | string | null;
  retryAfter?: number | string | null;
  retry_after_seconds?: number | string | null;
  code?: string | null;
  msg?: string | null;
  error_description?: string | null;
};

function toAuthRateLimitErrorLike(error: unknown): AuthRateLimitErrorLike {
  return error && typeof error === "object" ? (error as AuthRateLimitErrorLike) : {};
}

function extractRetryAfterSeconds(error: unknown) {
  const normalizedError = toAuthRateLimitErrorLike(error);
  const directValue =
    Number(normalizedError.retryAfterSeconds) ||
    Number(normalizedError.retry_after) ||
    Number(normalizedError.retryAfter) ||
    Number(normalizedError.status === 429 ? normalizedError.retry_after_seconds : 0);

  if (Number.isFinite(directValue) && directValue > 0) {
    return Math.ceil(directValue);
  }

  const message = String(normalizedError.message || normalizedError.msg || normalizedError.error_description || "");
  const secondsMatch = message.match(/(\d+)\s*seconds?/i);
  if (secondsMatch) {
    return Number(secondsMatch[1]);
  }

  return DEFAULT_AUTH_RETRY_SECONDS;
}

/**
 * Detect Supabase rate limiting errors.
 * Supabase returns various error messages when rate limited:
 * - "Too Many Requests"
 * - "rate limit exceeded"
 * - "For security purposes, you can only request this once every ..."
 * - "Email rate limit exceeded"
 */
export function getAuthRateLimitState(error: unknown) {
  const normalizedError = toAuthRateLimitErrorLike(error);
  const message = String(
    normalizedError.message ||
    normalizedError.msg ||
    normalizedError.error_description ||
    error ||
    ""
  );
  const status = Number(normalizedError.status || 0);
  const code = String(normalizedError.code || "").toLowerCase();
  const normalized = message.toLowerCase();

  const isRateLimited =
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "rate_limit_exceeded" ||
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("for security purposes") ||
    normalized.includes("once every") ||
    normalized.includes("too many");

  if (!isRateLimited) {
    return {
      isRateLimited: false,
      retryAfterSeconds: 0,
      message,
    };
  }

  const retryAfterSeconds = extractRetryAfterSeconds(error);
  // For Supabase server-side limits, use at least 15 minutes
  const effectiveRetry = Math.max(retryAfterSeconds, SUPABASE_RATE_LIMIT_DEFAULT_SECONDS);
  const minutes = Math.ceil(effectiveRetry / 60);

  return {
    isRateLimited: true,
    retryAfterSeconds: effectiveRetry,
    message: `Too many login attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`,
  };
}
