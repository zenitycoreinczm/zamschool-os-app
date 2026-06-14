import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { applyAuthApiRateLimit, authApiRateLimitResponse } from "@/lib/auth-api-rate-limit";
import { requireAdminSetupContext } from "@/lib/server-auth";
import { invalidateActorCaches } from "@/lib/invalidate-actor-caches";
import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import { createAuditLog } from "@/lib/audit-log";
import { initializeSchoolDefaults } from "@/lib/school-initialization";
import { isPrincipalEmailVerified } from "@/lib/principal-email-verified";

const registerSchoolSchema = z
  .object({
  email: z.string().email(),
  schoolName: z.string().min(2).max(120),
  schoolCode: z.string().min(4).max(50),
  headTeacherName: z.string().min(2).max(120).optional(),
  /** @deprecated Use headTeacherName — kept for older registration clients */
  adminName: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(300).optional().default(""),
  logoUrl: z.string().url().optional().or(z.literal("")),
  emisCode: z.string().max(60).optional().default(""),
  province: z.string().max(120).optional().default(""),
  district: z.string().max(120).optional().default(""),
  schoolType: z.string().max(120).optional().default(""),
  ownershipType: z.string().max(120).optional().default(""),
  /** The 6-digit access code that was pre-verified on the frontend */
  accessCode: z.string().length(6).regex(/^\d{6}$/, "Invalid access code format"),
})
  .superRefine((data, ctx) => {
    const name = String(data.headTeacherName || data.adminName || "").trim();
    if (name.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Head Teacher name is required",
        path: ["headTeacherName"],
      });
    }
  });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const access = await requireAdminSetupContext(req);
    if (!access.ok) return access.response;
    const { userId } = access.context;
    const rate = await applyAuthApiRateLimit({
      scope: "registerSchool",
      req,
      userId,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const body = await parseJsonWithSchema(req, registerSchoolSchema);
    const {
      email,
      schoolName,
      schoolCode,
      phone,
      address,
      logoUrl,
      emisCode,
      province,
      district,
      schoolType,
      ownershipType,
      accessCode,
    } = body;
    const headTeacherName = String(body.headTeacherName || body.adminName || "").trim();

    if (!email || !schoolName || !schoolCode || !headTeacherName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser.error || !authUser.data.user) {
      return NextResponse.json({ error: "Authenticated user could not be verified." }, { status: 401 });
    }

    const emailVerified = await isPrincipalEmailVerified(supabaseAdmin, userId, email);
    if (!emailVerified) {
      return NextResponse.json({ error: "Please verify your email before creating a school." }, { status: 403 });
    }

    // ── 1. Validate and consume the access code ──────────────────────────────
    const { data: codeRow, error: codeError } = await supabaseAdmin
      .from("access_codes")
      .select("code, expires_at, used_at, max_uses, use_count, province, district, school_type, ownership_type, approval_status")
      .eq("code", accessCode)
      .maybeSingle();

    if (codeError) {
      console.error("[register-school] access_code DB error:", codeError);
      return NextResponse.json({ error: "Could not verify access code." }, { status: 500 });
    }

    if (!codeRow) {
      return NextResponse.json({ error: "Invalid access code." }, { status: 400 });
    }

    const maxUses = Number(codeRow.max_uses || 1);
    const useCount = Number(codeRow.use_count || 0);

    if (codeRow.used_at || useCount >= maxUses) {
      return NextResponse.json({ error: "This access code has already been used." }, { status: 400 });
    }

    if (new Date() > new Date(codeRow.expires_at)) {
      return NextResponse.json({ error: "This access code has expired." }, { status: 400 });
    }

    if (codeRow.approval_status && codeRow.approval_status !== "approved") {
      return NextResponse.json({ error: "This access code is not approved for school creation yet." }, { status: 400 });
    }

    const codeMismatch =
      !matchesCodeScope(codeRow.province, province) ||
      !matchesCodeScope(codeRow.district, district) ||
      !matchesCodeScope(codeRow.school_type, schoolType) ||
      !matchesCodeScope(codeRow.ownership_type, ownershipType);

    if (codeMismatch) {
      return NextResponse.json(
        { error: "This access code was issued for a different province, district, school type, or ownership. Please check your school details match the code." },
        { status: 400 }
      );
    }

    // ── 2. Check for existing school membership ──────────────────────────────
    const { data: existingProfile, error: existingProfileError } = await fetchProfileByIdentity<{
      id?: string;
      school_id?: string | null;
    }>(supabaseAdmin as any, userId, "id, school_id", email);

    if (existingProfileError) {
      console.error("[register-school] profile lookup error:", existingProfileError);
      return NextResponse.json({ error: "Could not verify existing profile." }, { status: 500 });
    }

    if (existingProfile?.school_id) {
      return NextResponse.json({ error: "This account already belongs to a school" }, { status: 409 });
    }

    // ── 3. Normalize school code ─────────────────────────────────────────────
    const normalizedCode = String(schoolCode || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);

    if (normalizedCode.length < 4) {
      return NextResponse.json({ error: "Invalid school code" }, { status: 400 });
    }

    let finalCode = normalizedCode;
    const { data: existing } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("code", finalCode)
      .maybeSingle();

    if (existing) {
      finalCode = `${normalizedCode.slice(0, 8)}${nanoid(4).toUpperCase()}`;
    }

    // ── 4. Create school ─────────────────────────────────────────────────────
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: schoolName,
        code: finalCode,
        phone: phone || null,
        email,
        address: address || null,
        logo_url: logoUrl || null,
        emis_code: emisCode || null,
        province: province || null,
        district: district || null,
        school_type: schoolType || null,
        ownership_type: ownershipType || null,
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    // ── 5. Update auth user metadata ─────────────────────────────────────────
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        school_id: school.id,
        role: "principal",
        head_teacher_name: headTeacherName,
        admin_name: headTeacherName,
      },
    });

    // ── 6. Create or link Head Teacher profile ───────────────────────────────
    const profilePayload = {
      school_id: school.id,
      role: "principal",
      first_name: headTeacherName.split(" ").slice(0, -1).join(" ") || headTeacherName,
      last_name: headTeacherName.split(" ").slice(-1).join(" ") || "",
      email,
      phone,
      auth_user_id: userId,
    };

    const profileError = existingProfile?.id
      ? (
          await supabaseAdmin
            .from("profiles")
            .update(profilePayload)
            .eq("id", existingProfile.id)
        ).error
      : (
          await supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              ...profilePayload,
            },
            { onConflict: "id" }
          )
        ).error;

    if (profileError) {
      console.error("Profile creation error details:", JSON.stringify(profileError, null, 2));
      await supabaseAdmin.from("schools").delete().eq("id", school.id);
      throw new Error(profileError.message || "Failed to create Head Teacher profile");
    }

    await invalidateActorCaches(userId);

    const initialization = await initializeSchoolDefaults(school.id);

    // ── 7. Mark access code as used ──────────────────────────────────────────
    await supabaseAdmin
      .from("access_codes")
      .update({
        used_at: useCount + 1 >= maxUses ? new Date().toISOString() : null,
        used_by_email: email,
        use_count: useCount + 1,
      })
      .eq("code", accessCode);

    await createAuditLog({
      schoolId: school.id,
      userId,
      action: "school.created",
      entityType: "school",
      entityId: school.id,
      newData: {
        code: finalCode,
        name: schoolName,
        access_code: accessCode,
        initialization,
      },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, schoolCode: finalCode, initialization });
  } catch (error: unknown) {
    console.error("Registration API error:", safeErrorMessage(error, "Unknown registration error"));
    return NextResponse.json({
      error: safeErrorMessage(error, "An unexpected error occurred during registration")
    }, { status: 500 });
  }
}

function matchesCodeScope(expected: string | null | undefined, actual: string | null | undefined) {
  const expectedValue = String(expected || "").trim().toLowerCase();
  if (!expectedValue) return true;
  return expectedValue === String(actual || "").trim().toLowerCase();
}
