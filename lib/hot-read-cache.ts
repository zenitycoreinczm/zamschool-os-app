/**
 * Process-local debounce cache for very hot reads (badges, workspace shell).
 * NOT a replacement for Supabase — short TTL only to collapse burst traffic.
 */

import { SUPABASE_PROTECTION } from "./supabase-protection";

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function hotReadKey(parts: string[]) {
  return parts.filter(Boolean).join(":");
}

export async function withHotReadCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await fetchFn();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

export function invalidateHotReadKeys(matching: (key: string) => boolean): void {
  for (const key of store.keys()) {
    if (matching(key)) store.delete(key);
  }
}

export function invalidateInboxHotReads(userId: string, schoolId?: string | null): void {
  const uid = String(userId || "").trim();
  if (!uid) return;
  const sid = String(schoolId || "").trim();

  invalidateHotReadKeys((key) => {
    if (key.includes(`user:${uid}`)) return true;
    if (sid && key.includes(`school:${sid}`) && key.includes(`user:${uid}`)) return true;
    return false;
  });
}

export function invalidateWorkspaceHotRead(userId: string): void {
  const uid = String(userId || "").trim();
  if (!uid) return;
  store.delete(hotReadKey(["workspace", `user:${uid}`]));
  store.delete(hotReadKey(["auth-meta", `user:${uid}`]));
}

export const HOT_READ_TTL = {
  unreadCounts: SUPABASE_PROTECTION.unreadCountsTtlSec,
  workspaceStable: SUPABASE_PROTECTION.workspaceStableTtlSec,
  authMeta: SUPABASE_PROTECTION.authMetaTtlSec,
} as const;

if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, 60_000).unref?.();
}