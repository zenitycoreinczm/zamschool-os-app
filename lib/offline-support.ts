export const OFFLINE_CORE_PAGE_URLS = [
  "/app/dashboard",
  "/app/admin/users",
  "/app/admin/fees",
  "/app/admin/finance",
  "/app/announcements",
] as const;

export const OFFLINE_CORE_API_URLS = [
  "/api/admin/users",
  "/api/admin/classes",
  "/api/admin/subjects",
  "/api/admin/finance",
  "/api/admin/payments",
  "/api/admin/announcements",
] as const;

export const SLOW_NETWORK_THRESHOLD_MS = 1800;
export const OFFLINE_FETCH_ERROR_MESSAGE = "Offline: changes can't be saved yet.";

export function isOfflineCorePagePath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  return OFFLINE_CORE_PAGE_URLS.includes(normalizedPath as (typeof OFFLINE_CORE_PAGE_URLS)[number]);
}

export function isOfflineCoreApiPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  return OFFLINE_CORE_API_URLS.includes(normalizedPath as (typeof OFFLINE_CORE_API_URLS)[number]);
}

export function normalizePathname(pathname: string) {
  return String(pathname || "").split("?")[0] || "/";
}

export function isSlowNetworkLatency(latencyMs: number) {
  return Number(latencyMs) >= SLOW_NETWORK_THRESHOLD_MS;
}
