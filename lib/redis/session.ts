import {
  isRedisConfigured,
  redisGetJson,
  redisSetJson,
} from "@/lib/redis/client";
import { sessionMetaKey } from "@/lib/redis/keys";
import { REDIS_TTL } from "@/lib/redis/ttl";

/** Small session metadata only — not a replacement for Supabase auth cookies. */
export type SessionMeta = {
  userId: string;
  email?: string | null;
  lastSeenAt: number;
  userAgent?: string | null;
};

const SESSION_META_TTL_SEC = REDIS_TTL.sessionSec;

export async function touchActiveSession(meta: SessionMeta): Promise<void> {
  if (!isRedisConfigured()) return;
  await redisSetJson(
    sessionMetaKey(meta.userId),
    { ...meta, lastSeenAt: Date.now() },
    SESSION_META_TTL_SEC,
  );
}

export async function getActiveSessionMeta(
  userId: string,
): Promise<SessionMeta | null> {
  if (!isRedisConfigured()) return null;
  return redisGetJson<SessionMeta>(sessionMetaKey(userId));
}
