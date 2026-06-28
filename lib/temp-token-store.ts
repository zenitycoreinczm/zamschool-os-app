/**
 * Dual-store token persistence: Redis (primary) → Postgres (fallback).
 *
 * Used for OTP verification codes so that custom SMTP works even when
 * Redis is unavailable.  Supabase Auth is never used as a fallback.
 */
import { supabaseAdmin } from "@/lib/supabase";
import {
  storeTempToken as redisStore,
  readTempToken as redisRead,
  clearTempToken as redisClear,
} from "@/lib/redis/temp";

// ── Store ──────────────────────────────────────────────────────────

/**
 * Store a hashed OTP/verification token.
 * Tries Redis first; on failure, persists to the `temp_tokens` Postgres table.
 * Returns false only when both Redis AND Postgres are unavailable.
 */
export async function storeOtpToken(
  userId: string,
  tokenHash: string,
  ttlSeconds: number,
): Promise<boolean> {
  // 1. Try Redis (fast path)
  const redisOk = await redisStore("verify", userId, tokenHash, ttlSeconds);
  if (redisOk) return true;

  // 2. Fall back to Postgres
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const now = new Date().toISOString();

    // Clean up previous + expired tokens for this user in a single pass
    await supabaseAdmin
      .from("temp_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("kind", "verify");

    // Also clean up globally expired tokens (best-effort, non-blocking)
    void Promise.resolve(
      supabaseAdmin
        .from("temp_tokens")
        .delete()
        .lt("expires_at", now)
        .then(({ error }) => {
          if (error)
            console.error(
              "[temp-token-store] Expired cleanup failed:",
              error.message,
            );
        }),
    ).catch(() => {});

    await supabaseAdmin.from("temp_tokens").insert({
      token_hash: tokenHash,
      user_id: userId,
      kind: "verify",
      expires_at: expiresAt,
    });

    return true;
  } catch (err) {
    console.error("[temp-token-store] Postgres fallback failed:", err);
    return false;
  }
}

// ── Read ───────────────────────────────────────────────────────────

/**
 * Read a hashed OTP token for a user.
 * Tries Redis first; on miss, checks the `temp_tokens` Postgres table.
 * Returns null if the token is not found in either store (or expired).
 */
export async function readOtpToken(userId: string): Promise<string | null> {
  // 1. Try Redis (fast path)
  const redisValue = await redisRead("verify", userId);
  if (redisValue !== null) return redisValue;

  // 2. Fall back to Postgres
  try {
    const { data } = await supabaseAdmin
      .from("temp_tokens")
      .select("token_hash")
      .eq("user_id", userId)
      .eq("kind", "verify")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.token_hash ?? null;
  } catch (err) {
    console.error("[temp-token-store] Postgres read failed:", err);
    return null;
  }
}

// ── Clear ──────────────────────────────────────────────────────────

/** Remove all stored OTP tokens for a user (both Redis and Postgres). */
export async function clearOtpToken(userId: string): Promise<void> {
  await redisClear("verify", userId);

  try {
    await supabaseAdmin
      .from("temp_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("kind", "verify");
  } catch (err) {
    console.error("[temp-token-store] Postgres cleanup failed:", err);
  }
}
