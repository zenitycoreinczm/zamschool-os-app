/**
 * Batch Query Utility
 *
 * Executes queries in controlled batches to avoid bursting the Supabase
 * free tier 30 req/s limit. Includes exponential backoff on 429 responses
 * and minimum 33ms gaps between batches.
 */

import { waitForBudget, recordRequest } from './supabase-request-budget';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BatchOptions {
  /** Maximum number of concurrent requests per batch (default: 3) */
  concurrency?: number;
  /** Minimum delay between batch dispatches in ms (default: 33) */
  batchDelayMs?: number;
  /** Maximum number of retries on 429 responses (default: 3) */
  maxRetries?: number;
  /** Whether to use the Supabase budget system (default: true) */
  useBudget?: boolean;
  /** Optional signal to cancel the batch */
  signal?: AbortSignal;
}

interface BatchResult<T> {
  /** Results in the same order as input queries */
  results: T[];
  /** Number of successful executions */
  successCount: number;
  /** Number of failed executions */
  failureCount: number;
  /** Total time taken in ms */
  durationMs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if an error response indicates a 429 rate limit.
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Response && error.status === 429) return true;
  if (error && typeof error === 'object') {
    const e = error as any;
    if (e.status === 429 || e.statusCode === 429) return true;
    if (typeof e.message === 'string' && e.message.includes('429')) return true;
  }
  return false;
}

/**
 * Extract retry-after value from a 429 response, defaulting to 1 second.
 */
function getRetryAfterSeconds(error: unknown): number {
  if (error instanceof Response) {
    const val = error.headers?.get('Retry-After');
    if (val) return parseInt(val, 10) || 1;
  }
  if (error && typeof error === 'object') {
    const e = error as any;
    if (typeof e.retryAfter === 'number') return e.retryAfter;
    if (typeof e.retryAfter === 'string') return parseInt(e.retryAfter, 10) || 1;
  }
  return 1;
}

/**
 * Compute exponential backoff delay.
 * Base delay doubles each retry with jitter.
 */
function backoffDelay(attempt: number, baseMs: number = 500): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.2; // 20% jitter
  return Math.min(exponential + jitter, 30_000); // Cap at 30s
}

/**
 * Wait for the specified duration, respecting an AbortSignal.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Execute an array of async query functions in batches, limiting concurrency
 * to avoid bursting the Supabase free tier rate limit.
 *
 * Each batch fires up to `concurrency` queries in parallel, then waits at least
 * `batchDelayMs` before starting the next batch. On 429 responses, applies
 * exponential backoff with jitter.
 *
 * @param queries - Array of async functions to execute
 * @param options - Batch configuration
 * @returns Results in query order, plus execution metadata
 *
 * @example
 * ```ts
 * const { results } = await batchQueries([
 *   () => supabase.from('students').select('*').eq('class_id', '1'),
 *   () => supabase.from('students').select('*').eq('class_id', '2'),
 *   () => supabase.from('students').select('*').eq('class_id', '3'),
 * ]);
 * ```
 */
export async function batchQueries<T>(
  queries: (() => Promise<T>)[],
  options?: BatchOptions
): Promise<BatchResult<T>> {
  const {
    concurrency = 3,
    batchDelayMs = 33,
    maxRetries = 3,
    useBudget = true,
    signal,
  } = options ?? {};

  const startTime = Date.now();
  const total = queries.length;
  const results: T[] = new Array<T>(total);
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < total; i += concurrency) {
    if (signal?.aborted) {
      throw new DOMException('Batch query aborted', 'AbortError');
    }

    const batch = queries.slice(i, i + concurrency);
    const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);

    // Execute current batch concurrently
    const batchPromises = batch.map(async (query, idx) => {
      const resultIndex = batchIndices[idx];
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Wait for budget if enabled
          if (useBudget) {
            await waitForBudget(15_000);
          }

          const value = await query();

          // Record the request in the budget
          if (useBudget) {
            recordRequest();
          }

          results[resultIndex] = value;
          return;
        } catch (error: unknown) {
          lastError = error;

          if (isRateLimitError(error)) {
            const retryAfter = getRetryAfterSeconds(error);
            const backoff = Math.max(retryAfter * 1000, backoffDelay(attempt));

            console.warn(
              `[BatchQuery] Rate limited (429) on query ${resultIndex}/${total}, ` +
                `attempt ${attempt + 1}/${maxRetries + 1}. ` +
                `Backing off ${Math.round(backoff)}ms`
            );

            if (attempt < maxRetries) {
              await delay(backoff, signal);
              continue;
            }
          } else {
            // Non-rate-limit error: no retry unless it's a transient network error
            if (attempt < maxRetries && isTransientError(error)) {
              const backoff = backoffDelay(attempt);
              console.warn(
                `[BatchQuery] Transient error on query ${resultIndex}/${total}, ` +
                  `attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${Math.round(backoff)}ms`
              );
              await delay(backoff, signal);
              continue;
            }
            break;
          }
        }
      }

      // If we've exhausted retries, store the error
      results[resultIndex] = lastError as T;
      failureCount++;
    });

    await Promise.allSettled(batchPromises);

    // Calculate success count from results
    successCount = results.filter((r) => !(r instanceof Error)).length;

    // Wait between batches (unless this was the last batch)
    if (i + concurrency < total) {
      await delay(batchDelayMs, signal);
    }
  }

  return {
    results,
    successCount,
    failureCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Check if an error looks transient (network issue, timeout, etc.)
 */
function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as any;
  const msg = String(e.message || e.code || '').toLowerCase();

  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504')
  );
}

/**
 * Insert records into a Supabase table in batches, respecting the rate limit.
 *
 * Splits large arrays of records into smaller `.insert()` calls of `batchSize`
 * each, with a delay between batches to stay under 30 req/s.
 *
 * @param table - Supabase table name
 * @param records - Array of records to insert
 * @param batchSize - Number of records per insert call (default: 50)
 * @param options - Additional batch options
 *
 * @example
 * ```ts
 * const result = await batchInsert('students', studentRecords, 100);
 * ```
 */
export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  batchSize: number = 50,
  options?: Omit<BatchOptions, 'concurrency'>
): Promise<BatchResult<{ count: number }>> {
  if (records.length === 0) {
    return {
      results: [],
      successCount: 0,
      failureCount: 0,
      durationMs: 0,
    };
  }

  // Use the shared admin singleton to avoid creating a new client per call.
  const { supabaseAdmin: supabase } = await import('@/lib/supabase');

  const { batchDelayMs = 33, maxRetries = 3, useBudget = true, signal } = options ?? {};

  const startTime = Date.now();
  const results: { count: number }[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    if (signal?.aborted) {
      throw new DOMException('Batch insert aborted', 'AbortError');
    }

    const batch = records.slice(i, i + batchSize);
    let lastError: unknown;
    let inserted = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (useBudget) {
          await waitForBudget(15_000);
        }

        const { data, error } = await supabase
          .from(table)
          .insert(batch)
          .select('count');

        if (error) throw error;

        if (useBudget) {
          recordRequest();
        }

        const count = data?.[0]?.count ?? batch.length;
        results.push({ count });
        successCount++;
        inserted = true;
        break;
      } catch (error: unknown) {
        lastError = error;

        if (isRateLimitError(error)) {
          const retryAfter = getRetryAfterSeconds(error);
          const backoff = Math.max(retryAfter * 1000, backoffDelay(attempt));

          console.warn(
            `[BatchInsert] Rate limited on batch ${Math.floor(i / batchSize) + 1}, ` +
              `attempt ${attempt + 1}/${maxRetries + 1}. ` +
              `Backing off ${Math.round(backoff)}ms`
          );

          if (attempt < maxRetries) {
            await delay(backoff, signal);
            continue;
          }
        } else if (attempt < maxRetries && isTransientError(error)) {
          const backoff = backoffDelay(attempt);
          console.warn(
            `[BatchInsert] Transient error on batch ${Math.floor(i / batchSize) + 1}, ` +
              `attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${Math.round(backoff)}ms`
          );
          await delay(backoff, signal);
          continue;
        }
        break;
      }
    }

    if (!inserted) {
      failureCount++;
      console.error(`[BatchInsert] Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, lastError);
    }

    // Delay between batches (unless this was the last)
    if (i + batchSize < records.length) {
      await delay(batchDelayMs, signal);
    }
  }

  return {
    results,
    successCount,
    failureCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Variant of batchQueries that streams results as they complete instead of
 * waiting for the entire batch to finish.
 *
 * @param queries - Array of async functions to execute
 * @param onResult - Called with each result as it completes (index, value)
 * @param options - Batch configuration
 */
export async function batchQueriesStream<T>(
  queries: (() => Promise<T>)[],
  onResult: (index: number, value: T) => void,
  options?: BatchOptions
): Promise<BatchResult<T>> {
  const {
    concurrency = 3,
    batchDelayMs = 33,
    maxRetries = 3,
    useBudget = true,
    signal,
  } = options ?? {};

  const startTime = Date.now();
  const total = queries.length;
  const results: T[] = new Array<T>(total);
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < total; i += concurrency) {
    if (signal?.aborted) {
      throw new DOMException('Batch query stream aborted', 'AbortError');
    }

    const batch = queries.slice(i, i + concurrency);
    const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);

    const batchPromises = batch.map(async (query, idx) => {
      const resultIndex = batchIndices[idx];
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (useBudget) {
            await waitForBudget(15_000);
          }

          const value = await query();

          if (useBudget) {
            recordRequest();
          }

          results[resultIndex] = value;
          onResult(resultIndex, value);
          return;
        } catch (error: unknown) {
          lastError = error;

          if (isRateLimitError(error)) {
            const retryAfter = getRetryAfterSeconds(error);
            const backoff = Math.max(retryAfter * 1000, backoffDelay(attempt));

            console.warn(
              `[BatchQueryStream] Rate limited on query ${resultIndex}/${total}, ` +
                `attempt ${attempt + 1}/${maxRetries + 1}`
            );

            if (attempt < maxRetries) {
              await delay(backoff, signal);
              continue;
            }
          } else if (attempt < maxRetries && isTransientError(error)) {
            const backoff = backoffDelay(attempt);
            await delay(backoff, signal);
            continue;
          }
          break;
        }
      }

      results[resultIndex] = lastError as T;
      failureCount++;
    });

    await Promise.allSettled(batchPromises);
    successCount = results.filter((r) => !(r instanceof Error)).length;

    if (i + concurrency < total) {
      await delay(batchDelayMs, signal);
    }
  }

  return {
    results,
    successCount,
    failureCount,
    durationMs: Date.now() - startTime,
  };
}
