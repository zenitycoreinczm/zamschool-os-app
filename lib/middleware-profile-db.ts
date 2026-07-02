/**
 * Edge-safe profile role fetch (no enhanced-cache, no Redis).
 *
 * Uses a single query with an OR filter across id, auth_user_id, and email
 * instead of up to 3 sequential round-trips. Returns the first matching role.
 */
export async function fetchMiddlewareProfileRole(
  client: any,
  userId: string,
  userEmail?: string | null
): Promise<string | null> {
  // Build OR filter: always match by id and auth_user_id; add email when available.
  const orFilter = userEmail
    ? `id.eq.${userId},auth_user_id.eq.${userId},email.eq.${userEmail}`
    : `id.eq.${userId},auth_user_id.eq.${userId}`;

  const { data, error } = await client
    .from("profiles")
    .select("role")
    .or(orFilter)
    .limit(1)
    .maybeSingle();

  if (error || !data?.role) return null;
  return data.role;
}