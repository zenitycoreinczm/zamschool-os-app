/**
 * Edge-safe profile role fetch (no enhanced-cache, no Redis).
 */
export async function fetchMiddlewareProfileRole(
  client: any,
  userId: string,
  userEmail?: string | null
): Promise<string | null> {
  const columns = "role";

  const byId = await client
    .from("profiles")
    .select(columns)
    .eq("id", userId)
    .maybeSingle();
  if (byId.data?.role) return byId.data.role;

  const byAuth = await client
    .from("profiles")
    .select(columns)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (byAuth.data?.role) return byAuth.data.role;

  if (userEmail) {
    const byEmail = await client
      .from("profiles")
      .select(columns)
      .eq("email", userEmail)
      .maybeSingle();
    if (byEmail.data?.role) return byEmail.data.role;
  }

  return null;
}