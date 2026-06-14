import { fetchMiddlewareProfileRole } from "@/lib/middleware-profile-db";
import { normalizeRole, type KnownRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";

import { SUPABASE_PROTECTION } from "@/lib/supabase-protection";

/** Edge-safe (middleware cannot use TCP Redis). */
const ROLE_CACHE_TTL_MS = SUPABASE_PROTECTION.middlewareRoleTtlMs;
const roleCache = new Map<string, { role: KnownRole | null; expiresAt: number }>();

export async function resolveMiddlewareProfileRole(
  userId: string,
  userEmail?: string | null
): Promise<ReturnType<typeof normalizeRole>> {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role;
  }

  const roleRaw = await fetchMiddlewareProfileRole(
    supabaseAdmin as never,
    userId,
    userEmail
  );
  const role = normalizeRole(roleRaw);
  roleCache.set(userId, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
  return role;
}

export function invalidateMiddlewareProfileRole(userId: string) {
  const id = String(userId || "").trim();
  if (!id) return;
  roleCache.delete(id);
}

export function resetMiddlewareProfileRoleCache() {
  roleCache.clear();
}