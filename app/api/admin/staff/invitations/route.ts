import { NextResponse } from "next/server";
import { requireActorContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/server-guards";

// Only the Head Teacher (PRINCIPAL) and platform super admin can manage
// staff invitations through the admin API.
const ADMIN_STAFF_INVITATION_ROLES = ["PRINCIPAL", "SUPER_ADMIN"] as const;

export async function GET(req: Request) {
  try {
    const access = await requireActorContext(
      { allowedRoles: [...ADMIN_STAFF_INVITATION_ROLES], requireSchool: true },
      req,
    );
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    let query = supabaseAdmin.from("staff_invitations").select("id,email,first_name,last_name,role,accepted_at,revoked_at,created_at,invited_by", { count: "exact" }).eq("school_id", schoolId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status === "pending" || status === "active")
      query = query.is("revoked_at", null);
    if (status === "accepted")
      query = query.is("revoked_at", null);
    if (status === "revoked") query = query.not("revoked_at", "is", null);
    const { data, error, count } = await query;
    if (error) { console.error("[list-invitations] DB error:", error); return NextResponse.json({ error: "Failed to list invitations." }, { status: 500 }); }
    return NextResponse.json({ success: true, data: data || [], total: count ?? 0, offset, limit });
  } catch (err: unknown) {
    console.error("[list-invitations] Error:", safeErrorMessage(err));
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
