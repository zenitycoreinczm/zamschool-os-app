/** PostgREST filter matching profiles linked to the authenticated user (id or auth_user_id). */
export function profileIdentityOrFilter(authUserId: string) {
  const normalized = String(authUserId || "").trim();
  if (!normalized) {
    return "id.eq.00000000-0000-0000-0000-000000000000";
  }

  return `id.eq.${normalized},auth_user_id.eq.${normalized}`;
}