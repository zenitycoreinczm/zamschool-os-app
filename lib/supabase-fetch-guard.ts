/**
 * Supabase Per-User Fetch Guard
 *
 * Replaces globalThis.fetch with a guarded version that:
 * 1. Intercepts ALL requests to *.supabase.co
 * 2. Enforces a 25 req/s per-user sliding-window budget
 * 3. Each device/user has their OWN independent budget
 * 4. Records telemetry via supabase-request-budget.ts
 * 5. Logs slow queries (>1s) for debugging
 *
 * Per-user budget means 100 concurrent users can each make 25 req/s
 * without affecting each other's budgets.
 */
import { recordRequest } from "./supabase-request-budget";

// ─── Constants ──────────────────────────────────────────────────────────────

const SUPABASE_HOST_PATTERN = /\.supabase\.co/i;
const MAX_REQUESTS_PER_SECOND_PER_USER = 25;
const WINDOW_MS = 1000;
const SLOW_QUERY_THRESHOLD_MS = 1_000;
const DEVICE_ID_KEY = "zamschool_device_id";

// ─── State ──────────────────────────────────────────────────────────────────

let guardInstalled = false;
let originalFetch: typeof globalThis.fetch | null = null;

/** Per-device request tracking: deviceId → timestamps[] */
const perDeviceTimestamps = new Map<string, number[]>();

// ─── Device identification ─────────────────────────────────────────────────

/**
 * Get or create a unique device identifier.
 * This ensures each phone/browser has its own rate limit budget.
 */
function getDeviceId(): string {
  if (typeof window === "undefined") {
    // Server-side: use a unique identifier per request context
    return `server-${process.pid}-${Date.now()}`;
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a unique ID for this device
      deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // Fallback if localStorage is unavailable
    return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ─── Budget helpers ─────────────────────────────────────────────────────────

function getDeviceTimestamps(deviceId: string): number[] {
  if (!perDeviceTimestamps.has(deviceId)) {
    perDeviceTimestamps.set(deviceId, []);
  }
  return perDeviceTimestamps.get(deviceId)!;
}

function pruneWindow(deviceId: string): void {
  const timestamps = getDeviceTimestamps(deviceId);
  const cutoff = Date.now() - WINDOW_MS;
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) {
    i++;
  }
  if (i > 0) timestamps.splice(0, i);
}

function currentRate(deviceId: string): number {
  pruneWindow(deviceId);
  return getDeviceTimestamps(deviceId).length;
}

function recordLocalBudget(deviceId: string): void {
  pruneWindow(deviceId);
  getDeviceTimestamps(deviceId).push(Date.now());
}

/**
 * Synchronously wait until this device's budget allows another request.
 */
function waitForBudget(deviceId: string): void {
  const maxSpinMs = 5_000;
  const started = Date.now();

  while (currentRate(deviceId) >= MAX_REQUESTS_PER_SECOND_PER_USER) {
    if (Date.now() - started > maxSpinMs) {
      console.warn(
        `[SupabaseFetchGuard] Device ${deviceId.slice(0, 12)}... budget spin-wait timed out.`
      );
      return;
    }
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
      const deviceId = getDeviceId();

      // 1. Enforce per-device rate-limit budget
      waitForBudget(deviceId);

      const startTime = performance.now();

      // 2. Forward the request
      return original(input, init)
        .then((response) => {
          const duration = performance.now() - startTime;

          // 3. Record the request in this device's budget
          recordLocalBudget(deviceId);
          try {
            recordRequest();
          } catch {
            // Global budget recording is best-effort
          }

          // 4. Log slow Supabase calls
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
              }
            } else {
              console.warn(`[SupabaseFetchGuard] Slow query (${ms}ms): ${shortUrl}`);
            }
          }

          return response;
        })
        .catch((error) => {
          // Still record the request even on failure
          recordLocalBudget(deviceId);
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
 * Get current telemetry from the guard's per-device budget.
 */
export function getFetchGuardTelemetry(): {
  currentRps: number;
  maxRps: number;
  installed: boolean;
  activeDevices: number;
} {
  const deviceId = typeof window !== "undefined" ? getDeviceId() : "server";
  return {
    currentRps: currentRate(deviceId),
    maxRps: MAX_REQUESTS_PER_SECOND_PER_USER,
    installed: guardInstalled,
    activeDevices: perDeviceTimestamps.size,
  };
}

/**
 * Reset guard state (useful for testing).
 */
export function resetFetchGuard(): void {
  perDeviceTimestamps.clear();
}

// ─── Helper for createCallingComponent that also installs guard ─────────────

export const guardSetupToken = Symbol("supabaseFetchGuardInstalled");
