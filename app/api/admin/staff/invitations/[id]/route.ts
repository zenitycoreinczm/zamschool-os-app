import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/server-guards";

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdminContext(_req);
    if (!access.ok) return access.response;
    const { id } = await params;
    const schoolId = access.context.schoolId;
    const { data: existing } = await supabaseAdmin.from("staff_invitations").select("id,accepted_at,revoked_at,school_id").eq("id", id).eq("school_id", schoolId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    if (existing.accepted_at || existing.revoked_at) return NextResponse.json({ error: "Only pending invitations can be revoked." }, { status: 400 });
    const { error } = await supabaseAdmin.from("staff_invitations").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("school_id", schoolId);
    if (error) { console.error("[revoke-invitation] DB error:", error); return NextResponse.json({ error: "Failed to revoke." }, { status: 500 }); }
    return NextResponse.json({ success: true, message: "Invitation revoked." });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdminContext(_req);
    if (!access.ok) return access.response;
    const { id } = await params;
    const schoolId = access.context.schoolId;
    const { error } = await supabaseAdmin.from("staff_invitations").delete().eq("id", id).eq("school_id", schoolId).not("revoked_at", "is", null);
    if (error) { console.error("[delete-invitation] DB error:", error); return NextResponse.json({ error: "Failed to delete." }, { status: 500 }); }
    return NextResponse.json({ success: true, message: "Invitation deleted." });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
