/**
 * Supabase Global Fetch Guard
 *
 * Replaces globalThis.fetch with a guarded version that:
 * 1. Intercepts ALL requests to *.supabase.co
 * 2. Enforces a 25 req/s sliding-window budget before forwarding
 * 3. Records telemetry via supabase-request-budget.ts
 * 4. Logs slow queries (>1s) for debugging
 *
 * This is the outermost layer of a 3-layer protection system:
 *   Layer 1: Global fetch interceptor (this file) — automatic, zero-code-changes
 *   Layer 2: withSupabaseGuard() — per-query retry + budget check
 *   Layer 3: withBudget() — raw Supabase client method wrapper with queue
 *
 * Install on the server via instrumentation.ts.
 * Install on the client via SupabaseGuardBootstrap.tsx.
 */
import { recordRequest } from "./supabase-request-budget";

// ─── Constants ──────────────────────────────────────────────────────────────

const SUPABASE_HOST_PATTERN = /\.supabase\.co/i;
const MAX_REQUESTS_PER_SECOND = 25;
const WINDOW_MS = 1000;
const SLOW_QUERY_THRESHOLD_MS = 1_000;

// ─── State ──────────────────────────────────────────────────────────────────

let guardInstalled = false;
let originalFetch: typeof globalThis.fetch | null = null;

/** Timestamps of requests in the current sliding window (ms) */
const requestTimestamps: number[] = [];

// ─── Budget helpers ─────────────────────────────────────────────────────────

function pruneWindow(): void {
  const cutoff = Date.now() - WINDOW_MS;
  let i = 0;
  while (i < requestTimestamps.length && requestTimestamps[i] < cutoff) {
    i++;
  }
  if (i > 0) requestTimestamps.splice(0, i);
}

function currentRate(): number {
  pruneWindow();
  return requestTimestamps.length;
}

function recordLocalBudget(): void {
  pruneWindow();
  requestTimestamps.push(Date.now());
}

/**
 * Synchronously wait until our budget allows another request.
 * Spins with short sleeps — worst-case wait is ~40ms at 25 req/s.
 */
function waitForBudget(): void {
  const maxSpinMs = 5_000;
  const started = Date.now();

  while (currentRate() >= MAX_REQUESTS_PER_SECOND) {
    if (Date.now() - started > maxSpinMs) {
      console.warn(
        `[SupabaseFetchGuard] Budget spin-wait timed out after ${maxSpinMs}ms. ` +
          `Releasing guard — downstream may hit rate limits.`
      );
      return;
    }
    // Busy-wait with short yields
    const deadline = Date.now() + 10;
    while (Date.now() < deadline) {
      /* spin */
    }
  }
}

// ─── Fetch guard ────────────────────────────────────────────────────────────

function createGuardedFetch(original: typeof globalThis.fetch): typeof globalThis.fetch {
  return function guardedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Only intercept Supabase API calls
    if (SUPABASE_HOST_PATTERN.test(url)) {
      // 1. Enforce rate-limit budget
      waitForBudget();

      const startTime = performance.now();

      // 2. Forward the request
      return original(input, init)
        .then((response) => {
          const duration = performance.now() - startTime;

          // 3. Record the request in both local and global budget
          recordLocalBudget();
          try {
            recordRequest();
          } catch {
            // Global budget recording is best-effort
          }

          // 4. Log slow Supabase calls (auth token exchange is often 1–3s on real networks)
          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            const ms = Math.round(duration);
            const shortUrl = url.slice(0, 200);
            const isAuthToken =
              /\/auth\/v1\/token/i.test(url) || /\/auth\/v1\/(signup|verify|recover)/i.test(url);

            if (isAuthToken) {
              if (duration > 3_000) {
                console.warn(
                  `[SupabaseFetchGuard] Slow auth request (${ms}ms): ${shortUrl}`
                );
              } else if (process.env.NODE_ENV === "development") {
                console.debug(
                  `[SupabaseFetchGuard] Auth request (${ms}ms): ${shortUrl}`
                );
              }
            } else {
              console.warn(`[SupabaseFetchGuard] Slow query (${ms}ms): ${shortUrl}`);
            }
          }

          return response;
        })
        .catch((error) => {
          // Still record the request even on failure
          recordLocalBudget();
          try {
            recordRequest();
          } catch {
            // best-effort
          }

          console.error(
            `[SupabaseFetchGuard] Request failed: ${url.slice(0, 200)} - ${error?.message ?? error}`
          );
          throw error;
        });
    }

    // Non-Supabase requests pass through unmodified
    return original(input, init);
  } as typeof globalThis.fetch;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Install the global fetch interceptor.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 * Call from instrumentation.ts (server) and SupabaseGuardBootstrap.tsx (client).
 */
export function installSupabaseFetchGuard(): void {
  if (guardInstalled) return;

  if (typeof globalThis === "undefined") {
    console.warn("[SupabaseFetchGuard] globalThis not available — skipping guard install.");
    return;
  }

  originalFetch = globalThis.fetch;
  const guardedFetch = createGuardedFetch(originalFetch);

  // Store original fetch for uninstall
  (guardedFetch as any).__originalFetch = originalFetch;

  globalThis.fetch = guardedFetch;
  guardInstalled = true;

  if (typeof window !== "undefined") {
    console.debug("[SupabaseFetchGuard] Client-side fetch guard installed.");
  }
}

/**
 * Uninstall the global fetch interceptor, restoring the original fetch.
 */
export function uninstallSupabaseFetchGuard(): void {
  if (!guardInstalled || !originalFetch) {
    console.warn("[SupabaseFetchGuard] Guard not installed — nothing to uninstall.");
    return;
  }

  globalThis.fetch = originalFetch;
  guardInstalled = false;
}

/**
 * Check whether the fetch guard is currently installed.
 */
export function isGuardInstalled(): boolean {
  return guardInstalled;
}

/**
 * Get current telemetry from the guard's inline budget.
 */
export function getFetchGuardTelemetry(): {
  currentRps: number;
  maxRps: number;
  installed: boolean;
} {
  return {
    currentRps: currentRate(),
    maxRps: MAX_REQUESTS_PER_SECOND,
    installed: guardInstalled,
  };
}

/**
 * Reset guard state (useful for testing).
 */
export function resetFetchGuard(): void {
  requestTimestamps.length = 0;
}

// ─── Helper for createCallingComponent that also installs guard ─────────────

export const guardSetupToken = Symbol("supabaseFetchGuardInstalled");
