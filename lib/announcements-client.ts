import { adminApiJson } from "@/lib/admin-browser-api";

const ANNOUNCEMENTS_TTL_MS = 60_000;

type CachedAnnouncements = {
  expiresAt: number;
  data: unknown[];
};

const cache = new Map<string, CachedAnnouncements>();
const inflight = new Map<string, Promise<unknown[]>>();

export function invalidateAnnouncementsClientCache(endpoint?: string) {
  if (endpoint) {
    cache.delete(endpoint);
    inflight.delete(endpoint);
    return;
  }
  cache.clear();
  inflight.clear();
}

export async function fetchAnnouncementsList(endpoint: string, options: { force?: boolean } = {}) {
  if (!options.force) {
    const hit = cache.get(endpoint);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.data;
    }
  }

  if (!options.force && inflight.has(endpoint)) {
    return inflight.get(endpoint)!;
  }

  const promise = adminApiJson<{ data?: unknown[] }>(endpoint)
    .then((body) => {
      const rows = Array.isArray(body.data) ? body.data : [];
      cache.set(endpoint, {
        expiresAt: Date.now() + ANNOUNCEMENTS_TTL_MS,
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