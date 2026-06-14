import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { requireAdminContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { validateAdminManagedAssignmentTarget } from "@/lib/teacher-assignment-contract";
import {
  buildTeacherProfileLookup,
  hydrateAssignmentRows,
} from "@/lib/admin-route-hydration.mjs";

const createAssignmentSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  teacherId: z.string().min(1),
  dueDate: z.string().min(1),
  totalMarks: z.number().optional().default(100),
  description: z.string().optional().nullable(),
});

const updateAssignmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  teacherId: z.string().optional(),
  dueDate: z.string().optional(),
  totalMarks: z.number().optional(),
  description: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        subjects(name),
        classes(name),
        teacher:teachers!assignments_teacher_id_fkey(
          id,
          profile_id,
          profiles!teachers_profile_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: await attachTeacherProfiles(data || [], schoolId) });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to fetch assignments") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "assignments", "create");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-assignments:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createAssignmentSchema);
    const assignmentTarget = await validateAssignmentTarget({
      schoolId,
      classId: body.classId,
      subjectId: body.subjectId,
      teacherId: body.teacherId,
    });
    if (!assignmentTarget.ok) {
      return NextResponse.json({ error: assignmentTarget.error }, { status: assignmentTarget.status });
    }

    const payload: Record<string, any> = {
      school_id: schoolId,
      title: body.title.trim(),
      subject_id: assignmentTarget.data.subjectId,
      class_id: assignmentTarget.data.classId,
      teacher_id: assignmentTarget.data.teacherRowId,
      due_date: body.dueDate,
      total_marks: body.totalMarks,
      description: body.description || null,
    };

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to create assignment") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "assignments", "update");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `admin-assignments:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, updateAssignmentSchema);
    const currentAssignment = await fetchAssignmentRecord(body.id, schoolId);
    if (!currentAssignment) {
      return NextResponse.json({ error: "Assignment not found in this school" }, { status: 404 });
    }

    const mergedAssignment = {
      classId: body.classId || currentAssignment.class_id,
      subjectId: body.subjectId || currentAssignment.subject_id,
      teacherId: body.teacherId || currentAssignment.teacher_id,
    };
    const assignmentTarget = await validateAssignmentTarget({
      schoolId,
      classId: mergedAssignment.classId,
      subjectId: mergedAssignment.subjectId,
      teacherId: mergedAssignment.teacherId,
    });
    if (!assignmentTarget.ok) {
      return NextResponse.json({ error: assignmentTarget.error }, { status: assignmentTarget.status });
    }

    const payload: Record<string, any> = {};
    if (body.title) payload.title = body.title.trim();
    if (body.subjectId) payload.subject_id = assignmentTarget.data.subjectId;
    if (body.classId) payload.class_id = assignmentTarget.data.classId;
    if (body.teacherId) payload.teacher_id = assignmentTarget.data.teacherRowId;
    if (body.dueDate) payload.due_date = body.dueDate;
    if (body.totalMarks !== undefined) payload.total_marks = body.totalMarks;
    if (body.description !== undefined) payload.description = body.description;

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .update(payload)
      .eq("id", body.id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to update assignment") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "assignments", "delete");
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this admin account" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed to delete assignment") }, { status: 500 });
  }
}

async function validateAssignmentTarget(input: {
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
}) {
  const [classRow, subjectRow, teacherReferences] = await Promise.all([
    fetchSchoolOwnedRow("classes", input.classId, input.schoolId),
    fetchSchoolOwnedRow("subjects", input.subjectId, input.schoolId),
    fetchTeacherAssignmentReferences(input.schoolId, input.teacherId),
  ]);

  return validateAdminManagedAssignmentTarget({
    schoolId: input.schoolId,
    classRow,
    subjectRow,
    teacherId: input.teacherId,
    teacherProfiles: teacherReferences.teacherProfiles,
    teacherRows: teacherReferences.teacherRows,
  });
}

async function fetchAssignmentRecord(id: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id, school_id, class_id, subject_id, teacher_id")
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchSchoolOwnedRow(table: "classes" | "subjects", id: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id, school_id")
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

async function attachTeacherProfiles(rows: any[], schoolId: string) {
  const teacherIds = Array.from(
    new Set(
      (rows || [])
        .map((row) => String(row?.teacher_id || "").trim())
        .filter(Boolean)
    )
  );

  if (teacherIds.length === 0) {
    return hydrateAssignmentRows(rows, {});
  }

  const teacherProfileLookup = await fetchTeacherProfileLookup(schoolId, teacherIds);
  return hydrateAssignmentRows(rows, teacherProfileLookup);
}

async function fetchTeacherProfileLookup(schoolId: string, teacherIds: string[]) {
  const [directProfilesResult, teacherRowsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", teacherIds),
    supabaseAdmin
      .from("teachers")
      .select("id, profile_id")
      .eq("school_id", schoolId),
  ]);

  if (directProfilesResult.error) throw directProfilesResult.error;
  if (teacherRowsResult.error && !isMissingRelationError(teacherRowsResult.error)) {
    throw teacherRowsResult.error;
  }

  const teacherRows = (teacherRowsResult.data || []).filter(
    (row: any) => teacherIds.includes(String(row?.id || "")) || teacherIds.includes(String(row?.profile_id || ""))
  );

  const knownProfileIds = new Set((directProfilesResult.data || []).map((profile: any) => String(profile.id)));
  const missingProfileIds = Array.from(
    new Set(
      teacherRows
        .map((row: any) => String(row?.profile_id || "").trim())
        .filter((profileId) => profileId && !knownProfileIds.has(profileId))
    )
  );

  let linkedProfiles: any[] = [];
  if (missingProfileIds.length > 0) {
    const linkedProfilesResult = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", missingProfileIds);

    if (linkedProfilesResult.error) throw linkedProfilesResult.error;
    linkedProfiles = linkedProfilesResult.data || [];
  }

  return buildTeacherProfileLookup({
    teacherIds,
    teacherRows,
    profileRows: [...(directProfilesResult.data || []), ...linkedProfiles],
  });
}
