import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks if a user's email is verified via Supabase Auth.
 * The single source of truth is auth.users.email_confirmed_at.
 * The legacy email_verifications table is no longer used.
 */
export async function isPrincipalEmailVerified(
  admin: SupabaseClient,
  userId: string,
  _email: string
): Promise<boolean> {
  const authUser = await admin.auth.admin.getUserById(userId);
  return Boolean(authUser.data.user?.email_confirmed_at);
}
