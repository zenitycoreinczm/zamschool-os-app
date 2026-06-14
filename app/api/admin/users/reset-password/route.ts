import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildCreatedAuthUserMetadata,
  generateTemporaryPassword,
  shouldRequireFirstLoginPasswordChange,
} from "../../../../../lib/account-state";
import { requireAdminContext } from "../../../../../lib/server-auth";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "../../../../../lib/server-guards";
import { invalidateActorCachesForProfile } from "@/lib/invalidate-actor-caches";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { sendAccountCredentialsEmail } from "../../../../../lib/send-account-credentials";

const resetTemporaryPasswordSchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;

    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this admin account" },
        { status: 403 },
      );
    }

    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-users-reset-password:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const body = await parseJsonWithSchema(req, resetTemporaryPasswordSchema);
    const profileId = String(body.profileId || "").trim();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, role, email, first_name, last_name")
      .eq("id", profileId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const role = String(profile.role || "")
      .trim()
      .toLowerCase();
    if (!shouldRequireFirstLoginPasswordChange(role)) {
      return NextResponse.json(
        {
          error:
            "Temporary password reset is only available for managed accounts.",
        },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const authLookup = await supabaseAdmin.auth.admin.getUserById(profile.id);

    let authUser = authLookup.data.user;
    if (!authUser) {
      const email = String(profile.email || "")
        .trim()
        .toLowerCase();
      if (!email) {
        return NextResponse.json(
          { error: "Managed account email is missing." },
          { status: 400 },
        );
      }

      const createdAuth = await supabaseAdmin.auth.admin.createUser({
        id: profile.id,
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: buildCreatedAuthUserMetadata({
          firstName: String(profile.first_name || "").trim() || "User",
          lastName: String(profile.last_name || "").trim(),
          role,
        }),
      });

      if (createdAuth.error || !createdAuth.data.user) {
        throw (
          createdAuth.error || new Error("Failed to repair managed auth user")
        );
      }

      authUser = createdAuth.data.user;
    }

    const userMetadata = {
      ...(authUser.user_metadata || {}),
      role,
      must_change_password: true,
      first_name:
        (authUser.user_metadata?.first_name as string | undefined) ||
        String(profile.first_name || "").trim() ||
        "User",
      last_name:
        (authUser.user_metadata?.last_name as string | undefined) ||
        String(profile.last_name || "").trim(),
    };

    if (authLookup.data.user) {
      const updateAuth = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        {
          password: temporaryPassword,
          user_metadata: userMetadata,
        },
      );

      if (updateAuth.error) {
        throw updateAuth.error;
      }
    }

    const now = new Date().toISOString();
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: true,
        temporary_password_issued_at: now,
      })
      .eq("id", profile.id)
      .eq("school_id", schoolId);

    if (updateProfileError) {
      throw updateProfileError;
    }

    await invalidateActorCachesForProfile(supabaseAdmin, profile.id);

    // Send temporary credentials via custom SMTP
    const targetEmail = profile.email || authUser.email || "";
    const targetFirstName = String(profile.first_name || "").trim() || "User";
    if (targetEmail && temporaryPassword) {
      sendAccountCredentialsEmail({
        to: targetEmail,
        firstName: targetFirstName,
        role,
        temporaryPassword,
      }).catch((err) => {
        console.error("[admin-reset-password] Background email failed:", err);
      });
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      temporaryPassword,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to reset temporary password") },
      { status: 500 },
    );
  }
}
