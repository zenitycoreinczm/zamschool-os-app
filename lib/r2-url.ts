/** Edge-safe R2 URL helpers (no AWS SDK imports). */

export function normalizePublicBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}