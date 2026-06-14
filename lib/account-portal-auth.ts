import { NextResponse } from "next/server";

import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import { getCachedActorSnapshot, setCachedActorSnapshot } from "@/lib/redis-role-cache";
import { resolveVerifiedBearerUser } from "@/lib/supabase-auth-verify";
import { normalizeRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";

export type AccountPortalActor = {
  userId: string;
  schoolId: string;
};

export function readBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}

export async function authenticateAccountPortalRequest(
  req: Request
): Promise<AccountPortalActor | { response: NextResponse }> {
  const bearerToken = readBearerToken(req);
  if (bearerToken == null || !bearerToken) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { user, error } = await resolveVerifiedBearerUser(supabaseAdmin.auth, bearerToken);
  if (error || !user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const cached = await getCachedActorSnapshot(user.id);
  let schoolId = String(cached?.schoolId || "").trim();

  if (!schoolId) {
    const { data: profile, error: profileError } = await fetchProfileByIdentity<{
      role?: string | null;
      school_id?: string | null;
    }>(supabaseAdmin as never, user.id, "role, school_id", user.email);

    if (profileError) {
      throw profileError;
    }

    schoolId = String(profile?.school_id || "").trim();
    void setCachedActorSnapshot(user.id, {
      role: normalizeRole(profile?.role),
      schoolId: schoolId || null,
    });
  }
  if (!schoolId) {
    return {
      response: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }),
    };
  }

  return {
    userId: user.id,
    schoolId,
  };
}