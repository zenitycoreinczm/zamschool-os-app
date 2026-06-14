/**
 * Connection Pool Manager for Bursty Traffic
 *
 * Manages concurrent connections to prevent overwhelming Supabase
 * when 100+ users are active simultaneously. Uses a queue system
 * with configurable concurrency limits.
 *
 * Each user gets their own queue position, and the pool ensures
 * we don't exceed Supabase's rate limits while handling bursty traffic.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

const MAX_CONCURRENT_REQUESTS = 10; // Max simultaneous Supabase requests
const MAX_QUEUE_SIZE = 100; // Max queued requests before rejecting
const QUEUE_TIMEOUT_MS = 30_000; // 30s timeout for queued requests

// ─── State ──────────────────────────────────────────────────────────────────

interface QueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
  createdAt: number;
  userId?: string;
}

let activeRequests = 0;
const requestQueue: QueueItem[] = [];
let processing = false;

// ─── Helpers ────────────────────────────────────────────────────────────────

function processQueue(): void {
  if (processing) return;
  processing = true;

  try {
    while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
      const item = requestQueue.shift();
      if (!item) continue;

      // Check if request timed out while in queue
      if (Date.now() - item.createdAt > QUEUE_TIMEOUT_MS) {
        item.reject(new Error("Request timed out waiting for connection pool"));
        continue;
      }

      activeRequests++;
      item.resolve();
    }
  } finally {
    processing = false;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Acquire a connection from the pool.
 * Returns a promise that resolves when a connection is available.
 * Rejects if the queue is full or the request times out.
 */
export function acquireConnection(userId?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Fast path: connection available immediately
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
      return;
    }

    // Queue full - reject immediately
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      reject(new Error(`Connection pool full (${MAX_QUEUE_SIZE} queued). Try again later.`));
      return;
    }

    // Add to queue with timeout
    const item: QueueItem = {
      resolve,
      reject,
      createdAt: Date.now(),
      userId,
    };

    requestQueue.push(item);

    // Start processing queue
    processQueue();

    // Set timeout for queued request
    setTimeout(() => {
      const idx = requestQueue.findIndex((i) => i.resolve === resolve);
      if (idx !== -1) {
        requestQueue.splice(idx, 1);
        reject(new Error(`Request timed out after ${QUEUE_TIMEOUT_MS}ms in queue`));
      }
    }, QUEUE_TIMEOUT_MS);
  });
}

/**
 * Release a connection back to the pool.
 */
export function releaseConnection(): void {
  if (activeRequests > 0) {
    activeRequests--;
  }
  // Process more queued requests
  processQueue();
}

/**
 * Get current pool statistics.
 */
export function getPoolStats(): {
  active: number;
  queued: number;
  maxConcurrent: number;
  maxQueue: number;
  utilization: number;
} {
  return {
    active: activeRequests,
    queued: requestQueue.length,
    maxConcurrent: MAX_CONCURRENT_REQUESTS,
    maxQueue: MAX_QUEUE_SIZE,
    utilization: Math.round((activeRequests / MAX_CONCURRENT_REQUESTS) * 100),
  };
}

/**
 * Execute a function within the connection pool.
 * Automatically acquires and releases connections.
 */
export async function withConnection<T>(
  fn: () => Promise<T>,
  userId?: string
): Promise<T> {
  await acquireConnection(userId);
  try {
    return await fn();
  } finally {
    releaseConnection();
  }
}
