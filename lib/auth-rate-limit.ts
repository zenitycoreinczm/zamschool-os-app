export const DEFAULT_AUTH_RETRY_SECONDS = 30;

type AuthRateLimitErrorLike = {
  message?: string | null;
  status?: number | string | null;
  retryAfterSeconds?: number | string | null;
  retry_after?: number | string | null;
  retryAfter?: number | string | null;
  retry_after_seconds?: number | string | null;
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

  const message = String(normalizedError.message || "");
  const secondsMatch = message.match(/(\d+)\s*seconds?/i);
  if (secondsMatch) {
    return Number(secondsMatch[1]);
  }

  return DEFAULT_AUTH_RETRY_SECONDS;
}

export function getAuthRateLimitState(error: unknown) {
  const normalizedError = toAuthRateLimitErrorLike(error);
  const message = String(normalizedError.message || error || "");
  const status = Number(normalizedError.status || 0);
  const normalized = message.toLowerCase();
  const isRateLimited =
    status === 429 ||
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("for security purposes");

  if (!isRateLimited) {
    return {
      isRateLimited: false,
      retryAfterSeconds: 0,
      message,
    };
  }

  const retryAfterSeconds = extractRetryAfterSeconds(error);
  return {
    isRateLimited: true,
    retryAfterSeconds,
    message: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`,
  };
}
