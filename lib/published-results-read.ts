import { withCache, invalidateByTag } from "@/lib/enhanced-cache";

const PUBLISHED_RESULTS_CACHE = {
  ttlSeconds: 300,
  staleWhileRevalidate: 900,
  tags: ["results" as const],
};

export async function withPublishedResultsCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  return withCache(`published:${cacheKey}`, fetchFn, PUBLISHED_RESULTS_CACHE);
}

export async function invalidatePublishedResultsCache() {
  await invalidateByTag("results");
}