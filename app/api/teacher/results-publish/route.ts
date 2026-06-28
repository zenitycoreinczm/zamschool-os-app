import { NextResponse } from "next/server";
import { z } from "zod";

import { invalidatePublishedResultsCache } from "@/lib/published-results-read";
import { buildExamCertificateNotificationPayloads } from "@/lib/result-notifications";
import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { requireTeacherContext } from "@/lib/server-auth";
import {
  parseJsonWithSchema,
  safeErrorMessage,
  applyRateLimit,
} from "@/lib/server-guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { auditDomainWrite } from "@/lib/audit-domain";
import { authorizeWorkflowTransition } from "@/lib/workflow-states";
import { refreshSchoolReadModels } from "@/lib/read-model-refresh";
import { getClientIp } from "@/lib/server-guards";

const publishSchema = z
  .object({
    assignmentId: z.string().uuid().optional(),
    resultIds: z.array(z.string().uuid()).min(1).optional(),
    examTitle: z.string().optional(),
    classId: z.string().uuid().optional(),
  })
  .refine(
    (value) =>
      value.assignmentId ||
      value.resultIds?.length ||
      (value.examTitle && value.classId),
    {
      message: "assignmentId, resultIds, or examTitle+classId is required",
    },
  );

export async function POST(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;

    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 },
      );
    }

    // Apply rate limiting
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `teacher-results-publish:${userId}:${ip}`,
      limit: 30,
      windowMs: 60_000, // 30 requests per minute
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const body = await parseJsonWithSchema(req, publishSchema);
    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: userId,
    });

    if (
      assignmentScope.actorTeacherIds.length === 0 ||
      assignmentScope.allowedClassIds.length === 0
    ) {
      return NextResponse.json(
        { error: "No assigned result scope found" },
        { status: 403 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from("results")
      .select(
        `
          id,
          student_id,
          assignment_id,
          assignments!inner(
            id,
            title,
            class_id,
            subject_id,
            teacher_id
          )
        `,
      )
      .eq("school_id", schoolId);

    if (body.examTitle && body.classId) {
      const { data: examAssignments } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .eq("school_id", schoolId)
        .eq("class_id", body.classId)
        .eq("title", body.examTitle);

      const examAssignmentIds = (examAssignments || []).map((a: any) => a.id);
      if (examAssignmentIds.length === 0) {
        return NextResponse.json(
          { error: "No assignments found for this exam and class" },
          { status: 404 },
        );
      }
      query = query.in("assignment_id", examAssignmentIds);
    } else if (body.assignmentId) {
      query = query.eq("assignment_id", body.assignmentId);
    } else if (body.resultIds?.length) {
      query = query.in("id", body.resultIds);
    }

    const { data: resultRows, error: resultError } = await query;
    if (resultError) throw resultError;

    const scopedResults = (resultRows || []).filter((row: any) => {
      const assignment = normalizeRelation(row.assignments);
      return (
        assignment &&
        assignmentScope.actorTeacherIds.includes(assignment.teacher_id) &&
        assignmentScope.allowedClassIds.includes(assignment.class_id)
      );
    });

    if (scopedResults.length === 0) {
      return NextResponse.json(
        { error: "No publishable results found in assigned scope" },
        { status: 404 },
      );
    }

    const publishedAt = new Date().toISOString();
    const resultIds = scopedResults.map((row: any) => row.id);

    // Teachers can only submit results for moderation, not publish directly.
    // The grading workflow is: draft → submitted → moderated → approved → published
    // Teachers move results to 'submitted'. Publishing requires admin approval.
    const newGradingStatus = "submitted";

    const { error: publishError } = await supabaseAdmin
      .from("results")
      .update({
        grading_status: newGradingStatus,
        submitted_at: publishedAt,
        submitted_by: userId,
      })
      .in("id", resultIds)
      .eq("school_id", schoolId);

    if (publishError) throw publishError;

    await syncResultNotifications({
      schoolId,
      teacherId: userId,
      publishedAt,
      rows: scopedResults,
    });

    await invalidatePublishedResultsCache();
    await refreshSchoolReadModels(schoolId);
    await auditDomainWrite({
      schoolId,
      userId,
      action: "results.submitted",
      entityType: "results",
      newData: { submittedCount: resultIds.length, submittedAt: publishedAt },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      data: {
        submittedCount: resultIds.length,
        submittedAt: publishedAt,
        resultIds,
        message:
          "Results submitted for moderation. An Academic Admin will review and forward for approval.",
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to publish results") },
      { status: 500 },
    );
  }
}

async function syncResultNotifications(input: {
  schoolId: string;
  teacherId: string;
  publishedAt: string;
  rows: any[];
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const studentIds = Array.from(
    new Set(input.rows.map((row) => row.student_id).filter(Boolean)),
  );

  const groupedByStudent = new Map<
    string,
    {
      studentId: string;
      examTitle: string;
      subjectCount: number;
    }
  >();

  for (const row of input.rows) {
    const assignment = normalizeRelation(row.assignments);
    const examTitle = assignment?.title || "Exam";
    const key = `${row.student_id}:${examTitle}`;

    if (!groupedByStudent.has(key)) {
      groupedByStudent.set(key, {
        studentId: row.student_id,
        examTitle,
        subjectCount: 0,
      });
    }
    groupedByStudent.get(key)!.subjectCount++;
  }

  const [teacherProfileResult, studentRowsResult, parentLinksResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", input.teacherId)
        .maybeSingle(),
      supabaseAdmin
        .from("students")
        .select("id, profile_id, school_id, class_id")
        .eq("school_id", input.schoolId)
        .in("id", studentIds),
      supabaseAdmin
        .from("parent_students")
        .select("parent_id, student_id")
        .in("student_id", studentIds),
    ]);

  if (teacherProfileResult.error) throw teacherProfileResult.error;
  if (studentRowsResult.error) throw studentRowsResult.error;
  if (parentLinksResult.error) throw parentLinksResult.error;

  const studentRows = studentRowsResult.data || [];
  const parentLinks = parentLinksResult.data || [];
  const classIds = Array.from(
    new Set(studentRows.map((row: any) => row.class_id).filter(Boolean)),
  );
  const parentIds = Array.from(
    new Set(parentLinks.map((row: any) => row.parent_id).filter(Boolean)),
  );
  const studentProfileIds = Array.from(
    new Set(studentRows.map((row: any) => row.profile_id).filter(Boolean)),
  );

  const [studentProfilesResult, parentRowsResult, classesResult] =
    await Promise.all([
      studentProfileIds.length > 0
        ? supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", studentProfileIds)
        : Promise.resolve({ data: [], error: null }),
      parentIds.length > 0
        ? supabaseAdmin
            .from("parents")
            .select("id, profile_id, school_id")
            .eq("school_id", input.schoolId)
            .in("id", parentIds)
        : Promise.resolve({ data: [], error: null }),
      classIds.length > 0
        ? supabaseAdmin
            .from("classes")
            .select("id, name")
            .eq("school_id", input.schoolId)
            .in("id", classIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (studentProfilesResult.error) throw studentProfilesResult.error;
  if (parentRowsResult.error) throw parentRowsResult.error;
  if (classesResult.error) throw classesResult.error;

  const teacherName = buildDisplayName(teacherProfileResult.data, "Teacher");
  const studentById = new Map(
    (studentRows || []).map((row: any) => [row.id, row]),
  );
  const studentProfileById = new Map(
    (studentProfilesResult.data || []).map((row: any) => [row.id, row]),
  );
  const classById = new Map(
    (classesResult.data || []).map((row: any) => [row.id, row]),
  );
  const parentProfileIdByParentId = new Map(
    (parentRowsResult.data || []).map((row: any) => [row.id, row.profile_id]),
  );

  const parentProfileIdsByStudentId = new Map<string, string[]>();
  for (const link of parentLinks) {
    const parentProfileId = parentProfileIdByParentId.get(link.parent_id);
    if (!parentProfileId) continue;
    const current = parentProfileIdsByStudentId.get(link.student_id) || [];
    current.push(parentProfileId);
    parentProfileIdsByStudentId.set(link.student_id, current);
  }

  const payloads: Array<{
    user_id: string;
    dedupe_key: string;
    title: string;
    message: string;
    type: string;
  }> = [];

  for (const [, group] of groupedByStudent) {
    const student = studentById.get(group.studentId);
    const studentProfile = student?.profile_id
      ? studentProfileById.get(student.profile_id)
      : null;
    if (!student?.profile_id || !studentProfile) continue;

    const parentIdsForStudent =
      parentProfileIdsByStudentId.get(group.studentId) || [];

    payloads.push(
      ...buildExamCertificateNotificationPayloads({
        examTitle: group.examTitle,
        studentUserId: student.profile_id,
        studentId: group.studentId,
        parents: Array.from(new Set(parentIdsForStudent)).map((id) => ({ id })),
        studentName: buildDisplayName(studentProfile, "Student"),
        className: classById.get(student.class_id || "")?.name || "Class",
        teacherName,
        publishedAt: input.publishedAt,
        subjectCount: group.subjectCount,
      }),
    );
  }

  if (payloads.length === 0) {
    return;
  }

  const { enqueueNotifications } = await import("@/lib/notification-enqueue");
  await enqueueNotifications(input.schoolId, payloads);
}

function normalizeRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function buildDisplayName(
  row:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
  fallback: string,
) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.email ||
    fallback
  );
}
