import { NextResponse } from "next/server";

import { requireStudentContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { applyPlatformRateLimit, platformRateLimitResponse } from "@/lib/platform-api-guard";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireStudentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 }
      );
    }

    const rate = await applyPlatformRateLimit({
      scope: "student-assignments",
      schoolId,
      req,
      userId,
      preset: "heavyRead",
    });
    if (!rate.allowed) return platformRateLimitResponse(rate);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "50"), 1), 200);
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
    const subjectFilter = searchParams.get("subjectId") || null;

    const classId = await loadStudentClassId(userId, schoolId);
    if (!classId) {
      return applyEdgeCacheHeaders(
        NextResponse.json({ success: true, data: { rows: [], total: 0 } }),
        "noStore"
      );
    }

    let query = supabaseAdmin
      .from("assignments")
      .select("id, title, due_date, total_marks, description, subject_id, teacher_id, created_at", { count: "exact" })
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .order("due_date", { ascending: false });

    if (subjectFilter) {
      query = query.eq("subject_id", subjectFilter);
    }

    const { data: assignmentRows, error: assignmentError, count } = await query
      .range(offset, offset + limit - 1);

    if (assignmentError) throw assignmentError;

    const assignmentIds = (assignmentRows || []).map((r: any) => r.id);

    const [submissionsResult, subjectsResult, teachersResult] = await Promise.all([
      assignmentIds.length > 0
        ? supabaseAdmin
            .from("assignment_submissions")
            .select("id, assignment_id, submission_text, submission_link, submission_file_url, submission_file_name, submitted_at, updated_at")
            .eq("school_id", schoolId)
            .eq("student_profile_id", userId)
            .in("assignment_id", assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      loadSubjectMap(schoolId, (assignmentRows || []).map((r: any) => r.subject_id).filter(Boolean)),
      loadTeacherMap(schoolId, (assignmentRows || []).map((r: any) => r.teacher_id).filter(Boolean)),
    ]);

    if (submissionsResult.error) throw submissionsResult.error;

    const submissionMap = new Map(
      (submissionsResult.data || []).map((s: any) => [s.assignment_id, s])
    );

    const now = new Date();
    const rows = (assignmentRows || []).map((assignment: any) => {
      const submission = submissionMap.get(assignment.id);
      const dueDate = assignment.due_date ? new Date(`${assignment.due_date}T23:59:59.000Z`) : null;
      const urgent = dueDate ? dueDate.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 2 : false;

      return {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.due_date,
        totalMarks: assignment.total_marks ?? null,
        description: assignment.description || "",
        subjectName: subjectsResult.get(assignment.subject_id)?.name || "General",
        subjectCode: subjectsResult.get(assignment.subject_id)?.code || null,
        teacherName: teachersResult.get(assignment.teacher_id) || "Teacher pending",
        createdAt: assignment.created_at,
        urgent,
        submissionId: submission?.id || null,
        submissionText: submission?.submission_text || "",
        submissionLink: submission?.submission_link || null,
        submissionFileUrl: submission?.submission_file_url || null,
        submissionFileName: submission?.submission_file_name || null,
        submittedAt: submission?.submitted_at || null,
        updatedAt: submission?.updated_at || null,
        submissionStatus: submission ? "submitted" : "pending",
      };
    });

    return applyEdgeCacheHeaders(
      NextResponse.json({
        success: true,
        data: {
          rows,
          total: count || rows.length,
          limit,
          offset,
        },
      }),
      "noStore"
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load assignments") },
      { status: 500 }
    );
  }
}

async function loadStudentClassId(profileId: string, schoolId: string) {
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("class_id")
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (!profileResult.error && profileResult.data?.class_id) {
    return profileResult.data.class_id;
  }

  const studentResult = await supabaseAdmin
    .from("students")
    .select("class_id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (studentResult.error) throw studentResult.error;
  return studentResult.data?.class_id || null;
}

async function loadSubjectMap(schoolId: string, subjectIds: string[]) {
  if (subjectIds.length === 0) return new Map<string, { name: string; code: string | null }>();
  const uniqueIds = Array.from(new Set(subjectIds));
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name, code")
    .eq("school_id", schoolId)
    .in("id", uniqueIds);
  if (error) throw error;
  return new Map((data || []).map((s: any) => [s.id, { name: s.name || "Subject", code: s.code || null }]));
}

async function loadTeacherMap(schoolId: string, teacherIds: string[]) {
  if (teacherIds.length === 0) return new Map<string, string>();
  const uniqueIds = Array.from(new Set(teacherIds));
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("school_id", schoolId)
    .in("id", uniqueIds);
  if (error) throw error;
  return new Map(
    (data || []).map((t: any) => [
      t.id,
      [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || t.email || "Teacher",
    ])
  );
}
