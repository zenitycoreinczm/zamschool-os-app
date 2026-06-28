import { buildAcademicContextLabel } from "@/lib/live-schema-adapters";
import { CACHE_CONFIGS, withCache } from "@/lib/enhanced-cache";
import { roleDatabaseValues } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";

export type DashboardRoleCounts = {
  admin: number;
  teacher: number;
  student: number;
  parent: number;
};

export type DashboardStudentTotals = {
  total: number;
  boys: number;
  girls: number;
  unspecified: number;
};

export type DashboardSummary = {
  schoolId: string;
  academicLabel: string;
  roleCounts: DashboardRoleCounts;
  studentTotals: DashboardStudentTotals;
};

export async function loadDashboardSummary(schoolId: string): Promise<DashboardSummary> {
  return withCache(
    `school:${schoolId}`,
    () => buildDashboardSummary(schoolId),
    {
      ...CACHE_CONFIGS.admin.analytics,
      tags: ["dashboard"],
    }
  );
}

async function buildDashboardSummary(schoolId: string): Promise<DashboardSummary> {
  const [
    yearResult,
    termResult,
    studentRows,
    studentCount,
    teacherCount,
    parentCount,
  ] = await Promise.all([
    supabaseAdmin
      .from("academic_years")
      .select("name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("terms")
      .select("name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from("profiles").select("id, gender, role").eq("school_id", schoolId),
    countSchoolRows("students", schoolId),
    countSchoolRows("teachers", schoolId),
    countSchoolRows("parents", schoolId),
  ]);

  const academicLabel = buildAcademicContextLabel(yearResult.data?.name, termResult.data?.name);

  const roleCounts: DashboardRoleCounts = {
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0,
  };

  const studentTotals: DashboardStudentTotals = {
    total: 0,
    boys: 0,
    girls: 0,
    unspecified: 0,
  };

  for (const row of studentRows.data || []) {
    const roleKey = resolveDashboardRoleKey(row.role);
    if (roleKey) {
      roleCounts[roleKey] += 1;
    }

    if (roleKey !== "student") {
      continue;
    }

    studentTotals.total += 1;
    const gender = normalizeStudentGender(row.gender);
    if (gender === "boys") studentTotals.boys += 1;
    else if (gender === "girls") studentTotals.girls += 1;
  }

  roleCounts.student = Math.max(roleCounts.student, studentCount);
  roleCounts.teacher = Math.max(roleCounts.teacher, teacherCount);
  roleCounts.parent = Math.max(roleCounts.parent, parentCount);
  studentTotals.total = Math.max(studentTotals.total, studentCount);
  studentTotals.unspecified = Math.max(0, studentTotals.total - studentTotals.boys - studentTotals.girls);

  return {
    schoolId,
    academicLabel,
    roleCounts,
    studentTotals,
  };
}

async function countSchoolRows(table: string, schoolId: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if (error) return 0;
  return count || 0;
}

function resolveDashboardRoleKey(role: unknown): keyof DashboardRoleCounts | null {
  const variants = roleDatabaseValues(String(role || ""));
  const normalized = variants.map((value) => value.toLowerCase());

  if (normalized.some((value) => ["admin", "principal", "super_admin"].includes(value))) {
    return "admin";
  }
  if (normalized.some((value) => value === "teacher")) {
    return "teacher";
  }
  if (normalized.some((value) => value === "student")) {
    return "student";
  }
  if (normalized.some((value) => value === "parent")) {
    return "parent";
  }

  return null;
}

function normalizeStudentGender(value: unknown): "boys" | "girls" | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (["male", "m", "boy", "boys"].includes(normalized)) return "boys";
  if (["female", "f", "girl", "girls"].includes(normalized)) return "girls";
  return null;
}
