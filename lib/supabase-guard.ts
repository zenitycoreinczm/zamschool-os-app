/**
 * Supabase Query Guard
 *
 * Wraps Supabase queries with budget management, rate-limit retry logic,
 * and error handling. Provides a drop-in wrapper for any Supabase
 * operation to ensure we stay within free-tier limits and gracefully
 * handle transient failures.
 *
 * Usage:
 *   const result = await withSupabaseGuard(
 *     () => supabase.from("academic_years").select("*"),
 *     "loadDashboardScope:academicYears"
 *   );
 */

import { checkBudget, recordRequest } from "./supabase-request-budget";

// ─── Retry Configuration ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500; // initial backoff for 429 responses
const NETWORK_RETRY_DELAY_MS = 1_000; // fixed 1s delay for network errors

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check whether an error is a Supabase 429 (rate limit exceeded).
 */
function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object") {
    // Supabase throws errors with a 'code' or 'status' property
    const status = (err as Record<string, unknown>).status ?? (err as Record<string, unknown>).code;
    if (status === 429) return true;

    // Some Supabase errors have a message containing "429"
    const message = String((err as Record<string, unknown>).message ?? "");
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) return true;
  }
  return false;
}

/**
 * Check whether an error is a network-level failure (fetch aborted, DNS,
 * connection refused, etc.) that is safe to retry after a short delay.
 */
function isNetworkError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const message = String((err as Record<string, unknown>).message ?? "");

    // Node.js / fetch network errors
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ECONNRESET") ||
      message.includes("abort") ||
      message.includes("econnreset") ||
      message.includes("socket hang up") ||
      message.includes("socket")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Compute exponential backoff delay with jitter.
 * Formula: min(base * 2^attempt + random(0, 200), 10_000)
 */
function computeBackoff(attempt: number): number {
  const baseDelay = BASE_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 200;
  return Math.min(baseDelay + jitter, 10_000);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Execute a Supabase operation wrapped with budget checking, rate-limit
 * retry logic, and request tracking.
 *
 * @param operation  - Async function that performs the Supabase query.
 * @param context    - Human-readable label for logging (e.g. function name).
 *
 * Automatically:
 * 1. Calls `checkBudget()` before executing the operation.
 * 2. Records the request via `recordRequest()` after completion.
 * 3. Retries up to 3 times with exponential backoff on 429 errors.
 * 4. Retries once after 1s on transient network errors.
 *
 * @returns The result of the operation.
 * @throws The last error encountered if all retries are exhausted.
 */
export async function withSupabaseGuard<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. Check budget before executing
      await checkBudget();

      // 2. Execute the operation
      const result = await operation();

      // 3. Record the request after success
      recordRequest();

      return result;
    } catch (err) {
      lastError = err;

      // 4. Handle rate limit (429) with exponential backoff
      if (isRateLimitError(err)) {
        if (attempt < MAX_RETRIES) {
          const delay = computeBackoff(attempt);
          console.warn(
            `[SupabaseGuard] Rate limit exceeded in "${context}" (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
              `Retrying in ${Math.round(delay)}ms.`,
          );
          await sleep(delay);
          continue;
        }

        // Last attempt exhausted – log and rethrow
        console.warn(
          `[SupabaseGuard] Rate limit exceeded in "${context}" – all ${MAX_RETRIES + 1} attempts exhausted.`,
        );
        throw err;
      }

      // 5. Handle network errors with a fixed 1s retry
      if (isNetworkError(err)) {
        if (attempt < MAX_RETRIES) {
          console.warn(
            `[SupabaseGuard] Network error in "${context}" (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
              `Retrying in ${NETWORK_RETRY_DELAY_MS}ms.`,
          );
          await sleep(NETWORK_RETRY_DELAY_MS);
          continue;
        }

        console.warn(
          `[SupabaseGuard] Network error in "${context}" – all ${MAX_RETRIES + 1} attempts exhausted.`,
        );
        throw err;
      }

      // 6. Non-retryable error – rethrow immediately
      throw err;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}
