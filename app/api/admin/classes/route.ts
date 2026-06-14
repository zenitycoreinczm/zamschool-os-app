import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { validateSupervisorAssignment } from "@/lib/teacher-assignment-contract";
import { buildCreateClassPayload } from "@/lib/class-route-payload.mjs";

const createClassSchema = z.object({
  gradeId: z.string().min(1).optional().nullable(),
  gradeLevel: z.number().int().min(1).max(13).optional(),
  name: z.string().min(1),
  capacity: z.number().optional().default(30),
  supervisorId: z.string().optional().nullable(),
});

const updateClassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  capacity: z.number().optional(),
  supervisorId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "classes", "read");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const data = await fetchClassRows(schoolId);
    const response = NextResponse.json({ success: true, data });
    response.headers.set("Cache-Control", "private, max-age=20, stale-while-revalidate=120");
    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch classes") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-classes:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createClassSchema);
    const supervisorValidation = await validateSupervisorPayload(schoolId, body.supervisorId);
    if (!supervisorValidation.ok) {
      return NextResponse.json({ error: supervisorValidation.error }, { status: supervisorValidation.status });
    }
    const resolvedGradeLevel = await resolveGradeLevelForCreate({
      schoolId,
      gradeId: body.gradeId || null,
      gradeLevel: body.gradeLevel,
      className: body.name,
    });

    const modernPayload = buildCreateClassPayload({
      schoolId,
      body,
      resolvedGradeLevel,
      supervisorProfileId: supervisorValidation.data.supervisorProfileId,
    });

    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert(modernPayload)
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ success: true, data });
    }

    if (!shouldUseLegacyClassSchema(error)) {
      throw error;
    }

    const legacyPayload = compactRecord({
      school_id: schoolId,
      name: body.name.trim(),
      capacity: body.capacity,
      supervisor_id: supervisorValidation.data.supervisorProfileId,
      grade_level: resolvedGradeLevel,
    });

    const legacyResult = await safeInsertWithMissingColumnRetry("classes", legacyPayload);
    return NextResponse.json({ success: true, data: legacyResult });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to create class") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-classes:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, updateClassSchema);

    const payload: Record<string, any> = {};
    if (body.name) payload.name = body.name.trim();
    if (body.capacity !== undefined) payload.capacity = body.capacity;
    if (body.supervisorId !== undefined) {
      const supervisorValidation = await validateSupervisorPayload(schoolId, body.supervisorId);
      if (!supervisorValidation.ok) {
        return NextResponse.json({ error: supervisorValidation.error }, { status: supervisorValidation.status });
      }
      payload.supervisor_id = supervisorValidation.data.supervisorProfileId;
    }

    const result = await safeUpdateClass(body.id, schoolId, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to update class") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("classes")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to delete class") }, { status: 500 });
  }
}

async function fetchClassRows(schoolId: string) {
  const modern = await supabaseAdmin
    .from("classes")
    .select(`
      *,
      grades(name, level),
      profiles:supervisor_id(first_name, last_name, email)
    `)
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (!modern.error) {
    return modern.data;
  }

  if (!shouldUseLegacyClassSchema(modern.error)) {
    throw modern.error;
  }

  const legacy = await supabaseAdmin
    .from("classes")
    .select(`
      id,
      school_id,
      name,
      capacity,
      supervisor_id,
      grade_level,
      profiles:supervisor_id(first_name, last_name, email)
    `)
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (legacy.error) throw legacy.error;

  return (legacy.data || []).map((row: any) => ({
    ...row,
    grade_id: null,
    grades:
      row.grade_level !== undefined && row.grade_level !== null
        ? {
            name: `Grade ${row.grade_level}`,
            level: row.grade_level,
          }
        : null,
  }));
}

async function safeUpdateClass(id: string, schoolId: string, payload: Record<string, any>) {
  const modern = await supabaseAdmin
    .from("classes")
    .update(payload)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (!modern.error) {
    return modern.data;
  }

  if (!shouldUseLegacyClassSchema(modern.error)) {
    throw modern.error;
  }

  return safeUpdateWithMissingColumnRetry("classes", id, schoolId, payload);
}

function shouldUseLegacyClassSchema(error: { code?: string | null; message?: string | null; details?: string | null } | null | undefined) {
  const message = String(error?.message || "");
  const details = String(error?.details || "");
  return (
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST200" ||
    message.includes("grade_id") ||
    message.includes("grades") ||
    details.includes("classes")
  );
}

function extractMissingColumn(message?: string) {
  if (!message) return null;
  const match = message.match(/column ([^.]+\.)?([a-zA-Z0-9_]+) does not exist/i);
  if (match?.[2]) return match[2];
  const missing = message.match(/Could not find the '([^']+)' column/i);
  return missing?.[1] || null;
}

async function safeInsertWithMissingColumnRetry(table: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 10; index += 1) {
    const result = await supabaseAdmin.from(table).insert(working).select().single();
    if (!result.error) {
      return result.data;
    }

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw result.error;
    }

    delete working[missingColumn];
  }

  throw new Error(`Failed to insert ${table}`);
}

async function safeUpdateWithMissingColumnRetry(table: string, id: string, schoolId: string, payload: Record<string, any>) {
  let working = { ...payload };
  for (let index = 0; index < 10; index += 1) {
    const result = await supabaseAdmin
      .from(table)
      .update(working)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (!result.error) {
      return result.data;
    }

    const missingColumn = extractMissingColumn(result.error.message);
    if (!missingColumn || !(missingColumn in working)) {
      throw result.error;
    }

    delete working[missingColumn];
  }

  throw new Error(`Failed to update ${table}`);
}

async function resolveGradeLevelForCreate(input: {
  schoolId: string;
  gradeId: string | null;
  gradeLevel?: number;
  className: string;
}) {
  if (input.gradeId) {
    const { data, error } = await supabaseAdmin
      .from("grades")
      .select("id, level")
      .eq("id", input.gradeId)
      .eq("school_id", input.schoolId)
      .maybeSingle();

    if (error) throw error;
    const level = data?.level;
    if (Number.isInteger(level)) {
      return level;
    }
  }

  if (Number.isInteger(input.gradeLevel)) {
    return input.gradeLevel;
  }

  return deriveGradeLevel(input.className);
}

function deriveGradeLevel(value: string) {
  const match = String(value || "").match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function compactRecord(record: Record<string, any>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

async function validateSupervisorPayload(schoolId: string, supervisorId: string | null | undefined) {
  const teacherReferences = await fetchTeacherAssignmentReferences(schoolId, supervisorId);
  return validateSupervisorAssignment({
    schoolId,
    supervisorId,
    teacherProfiles: teacherReferences.teacherProfiles,
    teacherRows: teacherReferences.teacherRows,
  });
}

async function fetchTeacherAssignmentReferences(schoolId: string, teacherId: string | null | undefined) {
  const normalizedTeacherId = String(teacherId || "").trim();
  if (!normalizedTeacherId) {
    return { teacherProfiles: [], teacherRows: [] };
  }

  const teacherProfiles: Array<{ id: string; school_id: string | null; role: string | null }> = [];
  const teacherRows: Array<{ id: string; profile_id: string | null; school_id: string | null }> = [];

  const { data: directProfile, error: directProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", normalizedTeacherId)
    .maybeSingle();

  if (directProfileError) throw directProfileError;
  if (directProfile) {
    teacherProfiles.push(directProfile);
  }

  const teacherRowResult = await supabaseAdmin
    .from("teachers")
    .select("id, profile_id, school_id")
    .eq("school_id", schoolId)
    .or(`id.eq.${normalizedTeacherId},profile_id.eq.${normalizedTeacherId}`);

  if (teacherRowResult.error && !isMissingRelationError(teacherRowResult.error)) {
    throw teacherRowResult.error;
  }

  for (const teacherRow of teacherRowResult.data || []) {
    teacherRows.push(teacherRow);

    if (
      teacherRow.profile_id &&
      !teacherProfiles.some((profile) => profile.id === teacherRow.profile_id)
    ) {
      const { data: rowProfile, error: rowProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", teacherRow.profile_id)
        .maybeSingle();

      if (rowProfileError) throw rowProfileError;
      if (rowProfile) {
        teacherProfiles.push(rowProfile);
      }
    }
  }

  return { teacherProfiles, teacherRows };
}

function isMissingRelationError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("does not exist");
}
