/**
 * Client-side events fetch with 60-second TTL cache and inflight deduplication.
 * Follows the same pattern as announcements-client.ts and dashboard-client.ts.
 */
import { accountApiJson } from "@/lib/account-portal-api";

const EVENTS_TTL_MS = 60_000;

export type AccountEvent = {
  id: string;
  title: string;
  description?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  target_role?: string | null;
  category?: string | null;
};

type CachedEvents = {
  expiresAt: number;
  data: AccountEvent[];
};

const cache = new Map<string, CachedEvents>();
const inflight = new Map<string, Promise<AccountEvent[]>>();

export function invalidateEventsClientCache(endpoint?: string) {
  if (endpoint) {
    cache.delete(endpoint);
    inflight.delete(endpoint);
    return;
  }
  cache.clear();
  inflight.clear();
}

export async function fetchAccountEventsList(
  endpoint: string = "/api/account/events?upcomingOnly=true&limit=50",
  options: { force?: boolean } = {}
): Promise<AccountEvent[]> {
  if (!options.force) {
    const hit = cache.get(endpoint);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.data;
    }
  }

  if (!options.force && inflight.has(endpoint)) {
    return inflight.get(endpoint)!;
  }

  const promise = accountApiJson<{ data?: AccountEvent[] }>(endpoint)
    .then((body) => {
      const rows = Array.isArray(body.data) ? body.data : [];
      cache.set(endpoint, {
        expiresAt: Date.now() + EVENTS_TTL_MS,
        data: rows,
      });
      return rows;
    })
    .finally(() => {
      inflight.delete(endpoint);
    });

  inflight.set(endpoint, promise);
  return promise;
}
