import { NextResponse } from "next/server";
import { requireActorContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit-log";
import { getClientIp, safeErrorMessage } from "@/lib/server-guards";

// Only the Head Teacher (PRINCIPAL) and platform super admin can revoke
// staff invitations through the admin API.
const ADMIN_STAFF_INVITATION_ROLES = ["PRINCIPAL", "SUPER_ADMIN"] as const;

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireActorContext(
      { allowedRoles: [...ADMIN_STAFF_INVITATION_ROLES], requireSchool: true },
      _req,
    );
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "update");
    if (!perm.ok) return perm.response;
    const { id } = await params;
    const schoolId = access.context.schoolId;
    const { data: existing } = await supabaseAdmin
      .from("staff_invitations")
      .select("id,accepted_at,revoked_at,school_id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!existing)
      return NextResponse.json(
        { error: "Invitation not found." },
        { status: 404 },
      );
    if (existing.accepted_at || existing.revoked_at)
      return NextResponse.json(
        { error: "Only pending invitations can be revoked." },
        { status: 400 },
      );
    const { error } = await supabaseAdmin
      .from("staff_invitations")
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) {
      console.error("[revoke-invitation] DB error:", error);
      return NextResponse.json({ error: "Failed to revoke." }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      userId: access.context.userId,
      action: "staff_invitation.revoked",
      entityType: "staff_invitation",
      entityId: id,
      oldData: existing,
      ipAddress: getClientIp(_req),
    });

    return NextResponse.json({ success: true, message: "Invitation revoked." });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireActorContext(
      { allowedRoles: [...ADMIN_STAFF_INVITATION_ROLES], requireSchool: true },
      _req,
    );
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "users", "delete");
    if (!perm.ok) return perm.response;
    const { id } = await params;
    const schoolId = access.context.schoolId;
    const { data: existing } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, email, role")
      .eq("id", id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Invitation not found." },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin
      .from("staff_invitations")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId)
      .not("revoked_at", "is", null);
    if (error) {
      console.error("[delete-invitation] DB error:", error);
      return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      userId: access.context.userId,
      action: "staff_invitation.deleted",
      entityType: "staff_invitation",
      entityId: id,
      oldData: existing,
      ipAddress: getClientIp(_req),
    });

    return NextResponse.json({ success: true, message: "Invitation deleted." });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
