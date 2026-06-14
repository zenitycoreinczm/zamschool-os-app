import type { SupabaseClient } from "@supabase/supabase-js";

import { invalidateCache } from "@/lib/enhanced-cache";
import { invalidateInboxHotReads } from "@/lib/inbox-read-cache";
import { invalidateMiddlewareProfileRole } from "@/lib/middleware-profile-cache";
import { invalidateWorkspaceHotRead } from "@/lib/workspace-context-server";

/** In-memory enhanced-cache entries for non-sensitive profile columns. */
export async function invalidateProfileCache(userId: string): Promise<void> {
  const id = String(userId || "").trim();
  if (!id) return;
  await invalidateCache(`profile:${id}:`);
}

/**
 * Node API routes only: profile cache + middleware role map + Redis actor snapshot.
 * Pass the Supabase auth user id when known.
 */
export async function invalidateActorCaches(authUserId: string): Promise<void> {
  const id = String(authUserId || "").trim();
  if (!id) return;

  await invalidateProfileCache(id);
  invalidateMiddlewareProfileRole(id);
  invalidateWorkspaceHotRead(id);
  invalidateInboxHotReads(id);

  const { invalidateRoleCache } = await import("@/lib/redis-role-cache");
  await invalidateRoleCache(id);
}

/** Resolve profile id ↔ auth_user_id and invalidate all linked identity keys. */
export async function invalidateActorCachesForProfile(
  client: SupabaseClient,
  profileId: string
): Promise<void> {
  const normalized = String(profileId || "").trim();
  if (!normalized) return;

  const ids = new Set<string>([normalized]);
  const { data } = await client
    .from("profiles")
    .select("id, auth_user_id")
    .eq("id", normalized)
    .maybeSingle();

  if (data?.id) ids.add(String(data.id));
  const authId = String(data?.auth_user_id || "").trim();
  if (authId) ids.add(authId);

  await Promise.all([...ids].map((id) => invalidateActorCaches(id)));
}