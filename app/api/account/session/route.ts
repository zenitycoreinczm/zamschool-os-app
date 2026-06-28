import { NextResponse } from "next/server";

import { authenticateAccountPortalRequest } from "@/lib/account-portal-auth";
import {
  applyPlatformRateLimit,
  platformRateLimitResponse,
} from "@/lib/platform-api-guard";
import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeRole } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const actor = await authenticateAccountPortalRequest(req);
    if ("response" in actor) return actor.response;

    const rate = await applyPlatformRateLimit({
      scope: "account-session-read",
      schoolId: actor.schoolId,
      req,
      userId: actor.userId,
      preset: "heavyRead",
    });
    if (!rate.allowed) return platformRateLimitResponse(rate);

    const columns =
      "id, email, role, first_name, last_name, school_id, last_login, created_at";
    const profileResult = actor.profileId
      ? await supabaseAdmin
          .from("profiles")
          .select(columns)
          .eq("id", actor.profileId)
          .eq("school_id", actor.schoolId)
          .maybeSingle()
      : await fetchProfileByIdentity(
          supabaseAdmin as never,
          actor.userId,
          columns,
          actor.email,
        );

    const { data: profile, error: profileError } = profileResult;

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for this signed-in account" },
        { status: 404 },
      );
    }

    // Fetch school name
    let schoolName: string | null = null;
    if (profile.school_id) {
      const { data: school } = await supabaseAdmin
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .maybeSingle();
      schoolName = school?.name || null;
    }

    const role = normalizeRole(profile.role);

    return NextResponse.json({
      success: true,
      data: {
        email: profile.email || null,
        role: role || profile.role || null,
        schoolName,
        lastLogin: profile.last_login || profile.created_at || null,
        firstName: profile.first_name || null,
        lastName: profile.last_name || null,
      },
    });
  } catch (error: unknown) {
    const message = safeErrorMessage(error, "Failed to load session");
    // Server-side log so the cause is recoverable in dev/staging logs.
    // Without this we'd only see "Failed to load session" in the client toast.
    if (process.env.NODE_ENV !== "production") {
      console.error("[/api/account/session] 500", error);
    }
    const body: { error: string; cause?: string } = { error: message };
    if (process.env.NODE_ENV !== "production") {
      // Surface the underlying detail in non-prod so the dev console +
      // the UI toast carry the real reason. Stays out of prod so we
      // don't leak internal column names, query snippets, etc.
      body.cause = safeErrorMessage(error, message);
    }
    return NextResponse.json(body, { status: 500 });
  }
}
