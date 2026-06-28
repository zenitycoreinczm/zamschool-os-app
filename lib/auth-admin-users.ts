import { supabaseAdmin } from "@/lib/supabase";

type SupabaseAuthUser = NonNullable<
  Awaited<
    ReturnType<typeof supabaseAdmin.auth.admin.getUserById>
  >["data"]["user"]
>;

async function findAuthUserByNormalizedEmail(
  normalizedEmail: string,
): Promise<SupabaseAuthUser | null> {
  let page = 1;
  const perPage = 200;
  const maxPages = 5;

  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) break;

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (match) return match as SupabaseAuthUser;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function findAuthUserByEmail(
  email: string,
): Promise<SupabaseAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return findAuthUserByNormalizedEmail(normalized);
}

/** Resolve an auth user id by email (Supabase admin API has no getUserByEmail). */
export async function findAuthUserIdByEmail(
  email: string,
  schoolId: string,
): Promise<string | null> {
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

  const authUser = await findAuthUserByNormalizedEmail(normalized);
  return authUser?.id || null;
}

export async function createOrUpdateAuthUserWithTemporaryPassword(input: {
  email: string;
  temporaryPassword: string;
  userMetadata: Record<string, unknown>;
  authUserId?: string | null;
}): Promise<{ user: SupabaseAuthUser; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Auth user email is required");

  const existingById = input.authUserId
    ? await supabaseAdmin.auth.admin.getUserById(input.authUserId)
    : null;
  const existingUser =
    existingById?.data.user || (await findAuthUserByNormalizedEmail(email));

  if (existingUser?.id) {
    // Only pass email when it differs so we don't trigger an unnecessary
    // email-change flow that may interfere with sign-in.
    const currentEmail = String(existingUser.email || "")
      .trim()
      .toLowerCase();
    const updatePayload: Record<string, unknown> = {
      password: input.temporaryPassword,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        ...input.userMetadata,
      },
    };
    if (currentEmail && currentEmail !== email) {
      updatePayload.email = email;
      updatePayload.email_confirm = true;
    }
    const updateAuth = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      updatePayload,
    );

    if (updateAuth.error || !updateAuth.data.user) {
      throw (
        updateAuth.error || new Error("Failed to update temporary password")
      );
    }

    return { user: updateAuth.data.user as SupabaseAuthUser, created: false };
  }

  const createAuth = await supabaseAdmin.auth.admin.createUser({
    ...(input.authUserId ? { id: input.authUserId } : {}),
    email,
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: input.userMetadata,
  });

  if (createAuth.error || !createAuth.data.user) {
    throw createAuth.error || new Error("Failed to create auth user");
  }

  return { user: createAuth.data.user as SupabaseAuthUser, created: true };
}
