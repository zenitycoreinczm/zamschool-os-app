import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "@/lib/server-guards";
import { requireActorContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { nanoid } from "nanoid";
import {
  buildCreatedAuthUserMetadata,
  generateTemporaryPassword,
} from "@/lib/account-state";
import { roleToStoredValue } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit-log";
import { canActorCreateSchoolRole } from "@/lib/account-create-policy";
import { sendAccountCredentialsEmail } from "@/lib/send-account-credentials";
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "admin",
    "teacher",
    "payments",
    "bursar",
    "deputy_head",
    "guidance_office",
    "academic_admin",
    "hr_admin",
    "ict_admin",
    "discipline_admin",
  ]),
  department: z.string().max(120).optional(),
  position: z.string().max(120).optional(),
  first_name: z.string().min(1).max(120),
  last_name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
});
const INVITATION_PUBLIC_COLUMNS =
  "id,school_id,invited_by,email,role,department,position,first_name,last_name,phone,token,expires_at,accepted_at,accepted_by,revoked_at,auth_user_id,created_at";
function generateToken(): string {
  return `${nanoid(32)}${Date.now().toString(36)}`;
}
function stripSensitiveFields(record: Record<string, unknown>) {
  const { temporary_password, ...safe } = record;
  void temporary_password;
  return safe;
}
export async function GET(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: [
        "PRINCIPAL",
        "DEPUTY_HEAD",
        "HR_ADMIN",
        "ADMIN",
        "SUPER_ADMIN",
      ],
      requireSchool: true,
    },
    req,
  );
  if (!access.ok) return access.response;
  const perm = await requireFeatureAccess(access.context, "users", "read");
  if (!perm.ok) return perm.response;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let query = supabaseAdmin
      .from("staff_invitations")
      .select(
        `${INVITATION_PUBLIC_COLUMNS}, invited_by_profile:invited_by(first_name, last_name, email)`,
      )
      .eq("school_id", access.context.schoolId)
      .order("created_at", { ascending: false });
    if (status === "pending")
      query = query.is("accepted_at", null).is("revoked_at", null);
    if (status === "accepted") query = query.not("accepted_at", "is", null);
    if (status === "revoked") query = query.not("revoked_at", "is", null);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to fetch invitations") },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: [
        "PRINCIPAL",
        "DEPUTY_HEAD",
        "HR_ADMIN",
        "ADMIN",
        "SUPER_ADMIN",
      ],
      requireSchool: true,
    },
    req,
  );
  if (!access.ok) return access.response;
  const perm = await requireFeatureAccess(access.context, "users", "create");
  if (!perm.ok) {
    console.error("Permission denied for staff invitation:", perm.response);
    return perm.response;
  }
  const ip = getClientIp(req);
  const rate = await applyRateLimit({
    key: `invitations:${access.context.schoolId}:${ip}`,
    limit: 30,
    windowMs: 60_000,
    failOpen: true,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }
  let step = "parsing";
  try {
    const body = await parseJsonWithSchema(req, createInvitationSchema);
    const { email, role, department, position, first_name, last_name, phone } =
      body;
    if (!email || !role || !first_name || !last_name) {
      return NextResponse.json(
        {
          error: "Missing required fields: email, role, first_name, last_name",
        },
        { status: 400 },
      );
    }
    const normalizedRole = roleToStoredValue(role);
    if (!normalizedRole) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 },
      );
    }
    if (!canActorCreateSchoolRole(access.context.role, normalizedRole)) {
      return NextResponse.json(
        { error: "You don't have permission to invite staff" },
        { status: 403 },
      );
    }
    step = "duplicate_check";
    const { data: existing } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, email")
      .eq("school_id", access.context.schoolId)
      .eq("email", email)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email address" },
        { status: 409 },
      );
    }
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("school_id", access.context.schoolId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json(
        { error: "A user with this email already exists at this school" },
        { status: 409 },
      );
    }
    // Delete old staff_invitations (accepted or revoked) for this email
    // Also clean up orphaned auth users from those old invitations
    const { data: oldInvites } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, auth_user_id")
      .eq("school_id", access.context.schoolId)
      .eq("email", email)
      .or("accepted_at.not.is.null,revoked_at.not.is.null");

    if (oldInvites && oldInvites.length > 0) {
      for (const old of oldInvites) {
        if (old.auth_user_id) {
          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(
            old.auth_user_id,
          );
          if (delErr) {
            console.error(
              `[invite] Failed to clean up orphaned auth user ${old.auth_user_id}:`,
              delErr,
            );
          }
        }
      }
    }

    await supabaseAdmin
      .from("staff_invitations")
      .delete()
      .eq("school_id", access.context.schoolId)
      .eq("email", email)
      .or("accepted_at.not.is.null,revoked_at.not.is.null");
    const temporaryPassword = generateTemporaryPassword();
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    step = "auth_user_creation";
    const createAuth = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: buildCreatedAuthUserMetadata({
        firstName: first_name,
        lastName: last_name,
        role: normalizedRole,
      }),
    });
    if (createAuth.error || !createAuth.data.user) {
      console.error("Failed to create auth user:", createAuth.error);
      throw new Error(
        createAuth.error?.message || "Failed to create invited auth user",
      );
    }
    const authUserId = createAuth.data.user.id;
    step = "invitation_insert";
    const { data, error } = await supabaseAdmin
      .from("staff_invitations")
      .insert({
        school_id: access.context.schoolId,
        created_by: access.context.userId,
        invited_by: access.context.userId,
        email: email.toLowerCase().trim(),
        role: normalizedRole,
        department: department || null,
        position: position || null,
        first_name,
        last_name,
        phone: phone || null,
        token,
        temporary_password: temporaryPassword,
        temp_password_hash: temporaryPassword,
        auth_user_id: authUserId,
        expires_at: expiresAt,
      })
      .select(INVITATION_PUBLIC_COLUMNS)
      .single();
    if (error) {
      console.error("Failed to insert staff invitation:", error);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw error;
    }
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000"}/accept-invitation?token=${token}`;
    await createAuditLog({
      schoolId: access.context.schoolId,
      userId: access.context.userId,
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: data.id,
      newData: {
        email: email.toLowerCase().trim(),
        role: normalizedRole,
        department: department || null,
        position: position || null,
      },
      ipAddress: ip,
    });
    const emailPromise = sendAccountCredentialsEmail({
      to: email.toLowerCase().trim(),
      firstName: first_name,
      role: normalizedRole,
      temporaryPassword,
      acceptUrl,
    });

    emailPromise
      .then((result) => {
        console.log(
          `[invite] Credentials email sent to ${email} — messageId=${result.messageId || "N/A"}`,
        );
      })
      .catch((err) => {
        console.error("[invite] Background email failed:", err);
      });
    const safeData = stripSensitiveFields(
      data as unknown as Record<string, unknown>,
    );
    return NextResponse.json({
      success: true,
      data: { ...safeData, accept_url: acceptUrl },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Staff invitation failed at step '${step}':`, err);
    if (
      message.toLowerCase().includes("duplicate key") ||
      message.toLowerCase().includes("already been registered") ||
      message.toLowerCase().includes("already registered")
    ) {
      return NextResponse.json(
        {
          error:
            "An active invitation or account already exists for this email address",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: safeErrorMessage(
          err,
          "Failed to save invitation. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
export async function DELETE(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: [
        "PRINCIPAL",
        "DEPUTY_HEAD",
        "HR_ADMIN",
        "ADMIN",
        "SUPER_ADMIN",
      ],
      requireSchool: true,
    },
    req,
  );
  if (!access.ok) return access.response;
  const perm = await requireFeatureAccess(access.context, "users", "delete");
  if (!perm.ok) return perm.response;
  try {
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("id");
    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 },
      );
    }
    // Fetch the invitation to get the auth_user_id before revoking
    const { data: invite } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, auth_user_id, email")
      .eq("id", invitationId)
      .eq("school_id", access.context.schoolId)
      .is("accepted_at", null)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found or already accepted" },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin
      .from("staff_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("school_id", access.context.schoolId)
      .is("accepted_at", null);
    if (error) throw error;

    // Clean up the orphaned auth user created during the invitation
    if (invite.auth_user_id) {
      const { error: deleteAuthError } =
        await supabaseAdmin.auth.admin.deleteUser(invite.auth_user_id);
      if (deleteAuthError) {
        console.error(
          `[invite] Failed to delete auth user ${invite.auth_user_id} during revoke:`,
          deleteAuthError,
        );
      }
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to revoke invitation") },
      { status: 500 },
    );
  }
}
