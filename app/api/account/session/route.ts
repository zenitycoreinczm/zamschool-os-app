import { NextResponse } from "next/server";

import { authenticateAccountPortalRequest } from "@/lib/account-portal-auth";
import { applyPlatformRateLimit, platformRateLimitResponse } from "@/lib/platform-api-guard";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeRole } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const actor = await authenticateAccountPortalRequest(req);
    if ("response" in actor) return actor.response;

    const rate = await applyPlatformRateLimit({
      scope: "account-session-read",
      req,
      userId: actor.userId,
      preset: "heavyRead",
    });
    if (!rate.allowed) return platformRateLimitResponse(rate);

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, first_name, last_name, school_id, last_login, created_at")
      .eq("id", actor.userId)
      .eq("school_id", actor.schoolId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load session") },
      { status: 500 }
    );
  }
}
