import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildCreatedAuthUserMetadata,
  generateTemporaryPassword,
  shouldRequireFirstLoginPasswordChange,
} from "../../../../../lib/account-state";
import { requireAdminContext } from "../../../../../lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "../../../../../lib/server-guards";
import { invalidateActorCachesForProfile } from "@/lib/invalidate-actor-caches";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { sendAccountCredentialsEmail } from "../../../../../lib/send-account-credentials";
import { createOrUpdateAuthUserWithTemporaryPassword } from "@/lib/auth-admin-users";
import { auditDomainWrite } from "@/lib/audit-domain";

const resetTemporaryPasswordSchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "update");
    if (!perm.ok) return perm.response;

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

    const email = String(profile.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Managed account email is missing." },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const authResult = await createOrUpdateAuthUserWithTemporaryPassword({
      authUserId: profile.id,
      email,
      temporaryPassword,
      userMetadata: buildCreatedAuthUserMetadata({
        firstName: String(profile.first_name || "").trim() || "User",
        lastName: String(profile.last_name || "").trim(),
        role,
      }),
    });
    const authUser = authResult.user;

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

    await auditDomainWrite({
      schoolId,
      userId: access.context.userId,
      action: "users.reset_temporary_password",
      entityType: "profile",
      entityId: profile.id,
      newData: {
        role,
        email: targetEmail,
        temporaryPasswordIssuedAt: now,
      },
      ipAddress: ip,
    });

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
