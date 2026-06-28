import { NextResponse } from "next/server";

import { requireStudentContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { applyPlatformRateLimit, platformRateLimitResponse } from "@/lib/platform-api-guard";
import { supabaseAdmin } from "@/lib/supabase";

const RANGE_MS: Record<string, number> = {
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  "3m": 90 * 24 * 60 * 60 * 1000,
  "6m": 180 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  "all": 0,
};

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
      scope: "student-attendance",
      schoolId,
      req,
      userId,
      preset: "heavyRead",
    });
    if (!rate.allowed) return platformRateLimitResponse(rate);

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "1m";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "200"), 1), 500);
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

    const rangeMs = RANGE_MS[range] ?? RANGE_MS["1m"];
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10);
    const startDate = rangeMs > 0
      ? new Date(today.getTime() - rangeMs).toISOString().slice(0, 10)
      : "2000-01-01";

    const legacyStudentId = await loadLegacyStudentId(userId, schoolId);

    const attendanceResult = await queryAttendanceWithRange({
      schoolId,
      studentId: userId,
      startDate,
      endDate,
      limit,
      offset,
    });

    let rows = attendanceResult.rows;

    if (rows.length === 0 && legacyStudentId && legacyStudentId !== userId) {
      const legacyResult = await queryAttendanceWithRange({
        schoolId,
        studentId: legacyStudentId,
        startDate,
        endDate,
        limit,
        offset,
      });
      rows = legacyResult.rows;
    }

    const lessonIds = Array.from(
      new Set(rows.map((r: any) => r.lesson_id).filter(Boolean))
    );

    const [lessonsResult, subjectsResult, teachersResult, classResult] = await Promise.all([
      lessonIds.length > 0
        ? supabaseAdmin
            .from("lessons")
            .select("id, subject_id, teacher_id, start_time, end_time")
            .eq("school_id", schoolId)
            .in("id", lessonIds)
        : Promise.resolve({ data: [], error: null }),
      loadSubjectMap(schoolId, []),
      loadTeacherMap(schoolId, []),
      loadClassContext(userId, schoolId),
    ]);

    if (lessonsResult.error) throw lessonsResult.error;

    const lessonMap = new Map((lessonsResult.data || []).map((l: any) => [l.id, l]));
    const allSubjectIds = Array.from(new Set(
      (lessonsResult.data || []).map((l: any) => l.subject_id).filter(Boolean)
    ));
    const allTeacherIds = Array.from(new Set(
      (lessonsResult.data || []).map((l: any) => l.teacher_id).filter(Boolean)
    ));

    const [resolvedSubjects, resolvedTeachers] = await Promise.all([
      loadSubjectMap(schoolId, allSubjectIds),
      loadTeacherMap(schoolId, allTeacherIds),
    ]);

    const formattedRows = rows.map((row: any) => {
      const lesson = row.lesson_id ? lessonMap.get(row.lesson_id) : null;
      const subject = lesson?.subject_id ? resolvedSubjects.get(lesson.subject_id) : null;
      const teacher = lesson?.teacher_id ? resolvedTeachers.get(lesson.teacher_id) : null;

      return {
        id: row.id,
        date: row.date,
        status: normalizeStatus(row.status),
        remarks: row.remarks || "",
        subjectName: subject?.name || "Attendance record",
        className: classResult.className,
        teacherName: teacher || "Teacher pending",
        startTime: lesson?.start_time || null,
        endTime: lesson?.end_time || null,
      };
    });

    const summary = buildSummary(formattedRows);

    const countResult = await supabaseAdmin
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("student_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    const totalCount = countResult.count || formattedRows.length;

    return applyEdgeCacheHeaders(
      NextResponse.json({
        success: true,
        data: {
          range,
          startDate,
          endDate,
          summary,
          rows: formattedRows,
          total: totalCount,
          limit,
          offset,
        },
      }),
      "noStore"
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load attendance") },
      { status: 500 }
    );
  }
}

async function queryAttendanceWithRange(input: {
  schoolId: string;
  studentId: string;
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}) {
  const withLesson = await supabaseAdmin
    .from("attendance")
    .select("id, date, status, remarks, lesson_id")
    .eq("school_id", input.schoolId)
    .eq("student_id", input.studentId)
    .gte("date", input.startDate)
    .lte("date", input.endDate)
    .order("date", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (!withLesson.error) {
    return { hasLessonId: true, rows: withLesson.data || [] };
  }

  if (!isMissingColumnError(withLesson.error)) {
    throw withLesson.error;
  }

  const legacy = await supabaseAdmin
    .from("attendance")
    .select("id, date, status, remarks, created_at")
    .eq("school_id", input.schoolId)
    .eq("student_id", input.studentId)
    .gte("date", input.startDate)
    .lte("date", input.endDate)
    .order("date", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (legacy.error) throw legacy.error;

  return {
    hasLessonId: false,
    rows: (legacy.data || []).map((r: any) => ({ ...r, lesson_id: null })),
  };
}

async function loadLegacyStudentId(profileId: string, schoolId: string) {
  const { data } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return data?.id || null;
}

async function loadClassContext(profileId: string, schoolId: string) {
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("class_id")
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  const classId = profileResult.data?.class_id;
  if (!classId) return { className: "No class assigned" };

  const classResult = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .maybeSingle();

  return { className: classResult.data?.name || "Class" };
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

function normalizeStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toUpperCase();
  if (["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(normalized)) return normalized;
  return "ABSENT";
}

function buildSummary(rows: Array<{ status: string }>) {
  const summary = rows.reduce(
    (acc, row) => {
      if (row.status === "PRESENT") acc.PRESENT += 1;
      else if (row.status === "LATE") acc.LATE += 1;
      else if (row.status === "EXCUSED") acc.EXCUSED += 1;
      else acc.ABSENT += 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
  );

  const total = summary.PRESENT + summary.ABSENT + summary.LATE + summary.EXCUSED;
  const presentLike = summary.PRESENT + summary.LATE + summary.EXCUSED;

  return {
    ...summary,
    total,
    rate: total > 0 ? Math.round((presentLike / total) * 100) : 0,
  };
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("does not exist");
}
