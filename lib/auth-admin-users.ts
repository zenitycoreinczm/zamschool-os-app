import { supabaseAdmin } from "@/lib/supabase";

/** Resolve an auth user id by email (Supabase admin API has no getUserByEmail). */
export async function findAuthUserIdByEmail(email: string, schoolId: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("school_id", schoolId)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  if (profile?.id) return profile.id;

  let page = 1;
  const perPage = 200;
  const maxPages = 5;

  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}