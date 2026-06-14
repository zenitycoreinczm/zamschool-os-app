import { normalizeRole, type KnownRole } from "@/lib/roles";
import { roleCacheKey } from "@/lib/redis-keys";
import {
  isRedisConfigured,
  redisDel,
  redisGetJson,
  redisSetJson,
} from "@/lib/redis";
import { REDIS_TTL } from "@/lib/redis-ttl";

const ROLE_CACHE_TTL_SEC = REDIS_TTL.roleSec;

export type CachedActorSnapshot = {
  role: KnownRole | null;
  schoolId: string | null;
  profileId?: string | null;
};

/** Node.js API routes only — not for Edge middleware. */
export async function getCachedActorSnapshot(
  userId: string,
): Promise<CachedActorSnapshot | null> {
  if (!isRedisConfigured()) return null;
  return redisGetJson<CachedActorSnapshot>(roleCacheKey(userId));
}

export async function setCachedActorSnapshot(
  userId: string,
  snapshot: CachedActorSnapshot,
): Promise<void> {
  if (!isRedisConfigured()) return;
  await redisSetJson(roleCacheKey(userId), snapshot, ROLE_CACHE_TTL_SEC);
}

export async function getCachedUserRole(
  userId: string,
): Promise<KnownRole | null> {
  const cached = await getCachedActorSnapshot(userId);
  return cached?.role ?? null;
}

export async function setCachedUserRole(
  userId: string,
  role: KnownRole | null,
): Promise<void> {
  const existing = (await getCachedActorSnapshot(userId)) ?? {
    role: null,
    schoolId: null,
  };
  await setCachedActorSnapshot(userId, { ...existing, role });
}

export async function invalidateRoleCache(userId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  await redisDel(roleCacheKey(userId));
}
