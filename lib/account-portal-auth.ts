import { NextResponse } from "next/server";

import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import {
  getCachedActorSnapshot,
  setCachedActorSnapshot,
} from "@/lib/redis/role-cache";
import {
  resolveVerifiedAuthUser,
  resolveVerifiedBearerUser,
} from "@/lib/supabase-auth-verify";
import { normalizeRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export type AccountPortalActor = {
  userId: string;
  schoolId: string;
  email?: string | null;
  profileId?: string | null;
};

export function readBearerToken(req: Request) {
  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
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
  req: Request,
): Promise<AccountPortalActor | { response: NextResponse }> {
  const bearerToken = readBearerToken(req);
  const authResult = await resolveAccountPortalUser(bearerToken);
  if (authResult.error || !authResult.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = authResult.user;

  const cached = await getCachedActorSnapshot(user.id);
  let profileId = String(cached?.profileId || "").trim() || null;
  let schoolId = String(cached?.schoolId || "").trim();

  if (!schoolId || !profileId) {
    const { data: profile, error: profileError } =
      await fetchProfileByIdentity<{
        id?: string | null;
        role?: string | null;
        school_id?: string | null;
      }>(supabaseAdmin as never, user.id, "id, role, school_id", user.email);

    if (profileError) {
      throw profileError;
    }

    profileId = String(profile?.id || "").trim() || profileId;
    schoolId = String(profile?.school_id || schoolId || "").trim();
    void setCachedActorSnapshot(user.id, {
      role: normalizeRole(profile?.role ?? cached?.role),
      schoolId: schoolId || null,
      profileId,
    });
  }
  if (!schoolId) {
    return {
      response: NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 },
      ),
    };
  }

  return {
    userId: user.id,
    schoolId,
    email: user.email ?? null,
    profileId,
  };
}

async function resolveAccountPortalUser(bearerToken: string | null) {
  if (bearerToken !== null) {
    if (!bearerToken) {
      return { user: null, error: new Error("Invalid authorization header") };
    }
    return resolveVerifiedBearerUser(supabaseAdmin.auth, bearerToken);
  }

  const supabase = await createClient();
  return resolveVerifiedAuthUser(supabase);
}
