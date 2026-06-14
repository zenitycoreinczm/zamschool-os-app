// Build script for staff invitation API routes (4/9)
// NOTE: The actual API routes now live at /api/staff/invitations/ (unified).
//       This script generates legacy routes under /api/admin/staff/invitations/
//       and MUST use accepted_at/revoked_at timestamps (no "status" column).
const fs = require("fs");
const path = require("path");

function w(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("OK: " + filePath);
}

// 1. POST /api/admin/staff/invite
w("app/api/admin/staff/invite/route.ts", 'import { NextResponse } from "next/server";\n' +
'import { z } from "zod";\n' +
'import { requireAdminContext } from "@/lib/server-auth";\n' +
'import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";\n' +
'import { supabaseAdmin } from "@/lib/supabase";\n' +
'import { emailService } from "@/lib/email";\n' +
'import { randomBytes } from "crypto";\n' +
'\n' +
'function generateToken(): string {\n' +
'  return randomBytes(32).toString("hex");\n' +
'}\n' +
'\n' +
'const inviteSchema = z.object({\n' +
'  email: z.string().email(),\n' +
'  firstName: z.string().min(1).max(100),\n' +
'  lastName: z.string().min(1).max(100),\n' +
'  role: z.enum(["TEACHER","BURSAR","PAYMENTS","ACADEMIC_ADMIN","HR_ADMIN","ICT_ADMIN","DISCIPLINE_ADMIN","GUIDANCE_OFFICE"]),\n' +
'  phone: z.string().max(30).optional(),\n' +
'});\n' +
'\n' +
'export async function POST(req: Request) {\n' +
'  try {\n' +
'    const access = await requireAdminContext(req);\n' +
'    if (!access.ok) return access.response;\n' +
'    const ip = getClientIp(req);\n' +
'    const rate = await applyRateLimit({ key: `invite-staff:${ip}`, limit: 30, windowMs: 60_000, failOpen: true });\n' +
'    if (!rate.allowed) return NextResponse.json({ error: "Too many invitations." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });\n' +
'    const params = await parseJsonWithSchema(req, inviteSchema);\n' +
'    const schoolId = access.context.schoolId;\n' +
'    const invitedBy = access.context.userId;\n' +
'    const token = generateToken();\n' +
'\n' +
'    const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("school_id", schoolId).eq("email", params.email).maybeSingle();\n' +
'    if (existingProfile) return NextResponse.json({ error: "Staff member already exists." }, { status: 400 });\n' +
'\n' +
'    const { data: existingInvite } = await supabaseAdmin.from("staff_invitations").select("id").eq("email", params.email).eq("school_id", schoolId).is("accepted_at", null).is("revoked_at", null).maybeSingle();\n' +
'    if (existingInvite) return NextResponse.json({ error: "Pending invitation exists." }, { status: 400 });\n' +
'\n' +
'    const { error } = await supabaseAdmin.from("staff_invitations").insert({ email: params.email, first_name: params.firstName, last_name: params.lastName, role: params.role, school_id: schoolId, invited_by: invitedBy, token });\n' +
'    if (error) { console.error("[invite-staff] DB error:", error); return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 }); }\n' +
'\n' +
'    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";\n' +
'    const inviteUrl = `${baseUrl}/accept-invitation?token=${token}&email=${encodeURIComponent(params.email)}`;\n' +
'    const emailResult = await emailService.sendEmail({ to: params.email, subject: "You are invited to join ZamSchool", html: `<div><h2>Hello ${params.firstName},</h2><p>You have been invited as ${params.role}.</p><p><a href="${inviteUrl}">Accept Invitation</a></p></div>`, text: `Accept: ${inviteUrl}` });\n' +
'\n' +
'    return NextResponse.json({ success: true, emailSent: emailResult.success, data: { email: params.email, role: params.role } });\n' +
'  } catch (err: unknown) {\n' +
'    console.error("[invite-staff] Error:", safeErrorMessage(err));\n' +
'    return NextResponse.json({ error: safeErrorMessage(err, "Failed to send invitation.") }, { status: 500 });\n' +
'  }\n' +
'}\n');

// 2. GET /api/admin/staff/invitations
w("app/api/admin/staff/invitations/route.ts", 'import { NextResponse } from "next/server";\n' +
'import { requireAdminContext } from "@/lib/server-auth";\n' +
'import { supabaseAdmin } from "@/lib/supabase";\n' +
'import { safeErrorMessage } from "@/lib/server-guards";\n' +
'\n' +
'export async function GET(req: Request) {\n' +
'  try {\n' +
'    const access = await requireAdminContext(req);\n' +
'    if (!access.ok) return access.response;\n' +
'    const schoolId = access.context.schoolId;\n' +
'    const { searchParams } = new URL(req.url);\n' +
'    const status = searchParams.get("status") || "pending";\n' +
'    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);\n' +
'    const offset = parseInt(searchParams.get("offset") || "0");\n' +
'    let query = supabaseAdmin.from("staff_invitations").select("id,email,first_name,last_name,role,accepted_at,revoked_at,created_at,invited_by", { count: "exact" }).eq("school_id", schoolId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);\n' +
'    if (status === "pending") query = query.is("accepted_at", null).is("revoked_at", null);\n' +
'    if (status === "accepted") query = query.not("accepted_at", "is", null);\n' +
'    if (status === "revoked") query = query.not("revoked_at", "is", null);\n' +
'    const { data, error, count } = await query;\n' +
'    if (error) { console.error("[list-invitations] DB error:", error); return NextResponse.json({ error: "Failed to list invitations." }, { status: 500 }); }\n' +
'    return NextResponse.json({ success: true, data: data || [], total: count ?? 0, offset, limit });\n' +
'  } catch (err: unknown) {\n' +
'    console.error("[list-invitations] Error:", safeErrorMessage(err));\n' +
'    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });\n' +
'  }\n' +
'}\n');

// 3. PUT + DELETE /api/admin/staff/invitations/[id]
w("app/api/admin/staff/invitations/[id]/route.ts", 'import { NextResponse } from "next/server";\n' +
'import { requireAdminContext } from "@/lib/server-auth";\n' +
'import { supabaseAdmin } from "@/lib/supabase";\n' +
'import { safeErrorMessage } from "@/lib/server-guards";\n' +
'\n' +
'export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {\n' +
'  try {\n' +
'    const access = await requireAdminContext(_req);\n' +
'    if (!access.ok) return access.response;\n' +
'    const { id } = await params;\n' +
'    const schoolId = access.context.schoolId;\n' +
'    const { data: existing } = await supabaseAdmin.from("staff_invitations").select("id,accepted_at,revoked_at,school_id").eq("id", id).eq("school_id", schoolId).maybeSingle();\n' +
'    if (!existing) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });\n' +
'    if (existing.accepted_at || existing.revoked_at) return NextResponse.json({ error: "Only pending invitations can be revoked." }, { status: 400 });\n' +
'    const { error } = await supabaseAdmin.from("staff_invitations").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("school_id", schoolId);\n' +
'    if (error) { console.error("[revoke-invitation] DB error:", error); return NextResponse.json({ error: "Failed to revoke." }, { status: 500 }); }\n' +
'    return NextResponse.json({ success: true, message: "Invitation revoked." });\n' +
'  } catch (err: unknown) {\n' +
'    console.error("[revoke-invitation] Error:", safeErrorMessage(err));\n' +
'    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });\n' +
'  }\n' +
'}\n' +
'\n' +
'export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {\n' +
'  try {\n' +
'    const access = await requireAdminContext(_req);\n' +
'    if (!access.ok) return access.response;\n' +
'    const { id } = await params;\n' +
'    const schoolId = access.context.schoolId;\n' +
'    const { error } = await supabaseAdmin.from("staff_invitations").delete().eq("id", id).eq("school_id", schoolId).not("revoked_at", "is", null);\n' +
'    if (error) { console.error("[delete-invitation] DB error:", error); return NextResponse.json({ error: "Failed to delete." }, { status: 500 }); }\n' +
'    return NextResponse.json({ success: true, message: "Invitation deleted." });\n' +
'  } catch (err: unknown) {\n' +
'    console.error("[delete-invitation] Error:", safeErrorMessage(err));\n' +
'    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });\n' +
'  }\n' +
'}\n');

// 4. POST /api/accept-invitation (public)
w("app/api/accept-invitation/route.ts", 'import { NextResponse } from "next/server";\n' +
'import { z } from "zod";\n' +
'import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";\n' +
'import { supabaseAdmin } from "@/lib/supabase";\n' +
'\n' +
'const acceptSchema = z.object({\n' +
'  token: z.string().min(1),\n' +
'  email: z.string().email(),\n' +
'  password: z.string().min(8),\n' +
'  phone: z.string().max(30).optional(),\n' +
'});\n' +
'\n' +
'export async function POST(req: Request) {\n' +
'  try {\n' +
'    const ip = getClientIp(req);\n' +
'    const rate = await applyRateLimit({ key: `accept-invite:${ip}`, limit: 10, windowMs: 60_000, failOpen: true });\n' +
'    if (!rate.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });\n' +
'    const params = await parseJsonWithSchema(req, acceptSchema);\n' +
'\n' +
'    const { data: invitation, error: inviteError } = await supabaseAdmin.from("staff_invitations").select("id,email,first_name,last_name,role,school_id,token,accepted_at,revoked_at,created_at").eq("token", params.token).eq("email", params.email).is("accepted_at", null).is("revoked_at", null).maybeSingle();\n' +
'    if (inviteError || !invitation) return NextResponse.json({ error: "Invalid or expired invitation." }, { status: 400 });\n' +
'\n' +
'    const createdAt = new Date(invitation.created_at);\n' +
'    const exp = new Date(); exp.setDate(exp.getDate() - 7);\n' +
'    if (createdAt < exp) {\n' +
'      await supabaseAdmin.from("staff_invitations").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitation.id);\n' +
'      return NextResponse.json({ error: "Invitation has expired." }, { status: 400 });\n' +
'    }\n' +
'\n' +
'    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();\n' +
'    const eu = existingUsers?.users?.find(u => u.email?.toLowerCase() === params.email.toLowerCase());\n' +
'    let userId: string;\n' +
'    if (!eu) {\n' +
'      const { data: nu, error: ce } = await supabaseAdmin.auth.admin.createUser({ email: params.email, password: params.password, email_confirm: true, user_metadata: { first_name: invitation.first_name, last_name: invitation.last_name } });\n' +
'      if (ce || !nu.user) { console.error("[accept-invitation] createUser:", ce); return NextResponse.json({ error: "Failed to create account." }, { status: 500 }); }\n' +
'      userId = nu.user.id;\n' +
'    } else {\n' +
'      userId = eu.id;\n' +
'      const { data: ep } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).eq("school_id", invitation.school_id).maybeSingle();\n' +
'      if (ep) return NextResponse.json({ error: "Account already exists at this school." }, { status: 400 });\n' +
'    }\n' +
'\n' +
'    const { error: pe } = await supabaseAdmin.from("profiles").upsert({ id: userId, email: params.email, school_id: invitation.school_id, role: invitation.role, first_name: invitation.first_name, last_name: invitation.last_name, phone: params.phone || null, status: "ACTIVE" });\n' +
'    if (pe) { console.error("[accept-invitation] profile:", pe); return NextResponse.json({ error: "Failed to create profile." }, { status: 500 }); }\n' +
'\n' +
'    await supabaseAdmin.from("staff_invitations").update({ accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitation.id);\n' +
'\n' +
'    return NextResponse.json({ success: true, message: "Invitation accepted. You can now sign in.", data: { email: params.email, schoolId: invitation.school_id, role: invitation.role } });\n' +
'  } catch (err: unknown) {\n' +
'    console.error("[accept-invitation] Error:", safeErrorMessage(err));\n' +
'    return NextResponse.json({ error: safeErrorMessage(err, "Failed to accept invitation.") }, { status: 500 });\n' +
'  }\n' +
'}\n');

console.log("All 4 staff invitation routes created successfully.");
