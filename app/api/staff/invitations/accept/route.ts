import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import {
  applyAuthApiRateLimit,
  authApiRateLimitResponse,
} from "@/lib/auth-api-rate-limit";
import { buildCreatedProfilePayload } from "@/lib/account-state";
import { invalidateActorCaches } from "@/lib/invalidate-actor-caches";

const acceptSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const rate = await applyAuthApiRateLimit({ scope: "acceptInvitation", req });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const { token } = await parseJsonWithSchema(req, acceptSchema);

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        "id, email, school_id, role, first_name, last_name, phone, auth_user_id, expires_at, accepted_at",
      )
      .eq("token", token)
      .is("revoked_at", null)
      .maybeSingle();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 },
      );
    }

    if (invitation.expires_at && new Date() > new Date(invitation.expires_at)) {
      await supabaseAdmin
        .from("staff_invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", invitation.id);
      return NextResponse.json(
        { error: "This invitation has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "This invitation has already been accepted." },
        { status: 400 },
      );
    }

    const authUserId = invitation.auth_user_id;
    if (!authUserId) {
      return NextResponse.json(
        {
          error:
            "The invited account was not found. Ask your school administrator to resend the invitation.",
        },
        { status: 404 },
      );
    }

    const email = String(invitation.email || "")
      .toLowerCase()
      .trim();

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("school_id", invitation.school_id)
      .eq("email", email)
      .maybeSingle();

    if (!existingProfile) {
      const profilePayload = buildCreatedProfilePayload({
        authUserId,
        schoolId: invitation.school_id,
        role: invitation.role,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        email,
        phone: invitation.phone || null,
        profileExtras: {
          auth_user_id: authUserId,
        },
        now: new Date(),
      });

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileError) {
        console.error("[accept-invitation] Failed to create profile:", profileError);
        return NextResponse.json(
          { error: "Failed to set up account profile. Contact support." },
          { status: 500 },
        );
      }

      await invalidateActorCaches(authUserId);
    }

    const { error: updateError } = await supabaseAdmin
      .from("staff_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: authUserId,
      })
      .eq("token", token)
      .is("accepted_at", null);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message:
        "Invitation accepted. Sign in with your temporary password to finish first-login setup.",
      email,
      requiresFirstLogin: true,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to accept invitation") },
      { status: 500 },
    );
  }
}
