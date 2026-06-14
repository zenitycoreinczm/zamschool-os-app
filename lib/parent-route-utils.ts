import { buildParentLinkedStudentProfiles } from "@/lib/live-schema-adapters";
import { supabaseAdmin } from "@/lib/supabase";

export type ParentRecord = {
  id: string;
  relation_type?: string | null;
  profile_id?: string | null;
};

export type LinkedStudentsResult = {
  profileIds: string[];
  relationshipByProfileId: Map<string, string | null>;
  classIdByProfileId: Map<string, string | null>;
  studentNumberByProfileId: Map<string, string | null>;
  studentRowIdByProfileId?: Map<string, string>;
  profileIdByStudentRowId?: Map<string, string>;
};

export async function getParentRecord(input: {
  profileId: string;
  schoolId: string | null;
}): Promise<ParentRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("parents")
    .select("id, relation_type")
    .eq("profile_id", input.profileId)
    .eq("school_id", input.schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLinkedStudents(input: {
  parentRecordId: string;
  parentProfileId: string;
  schoolId: string | null;
  fallbackRelationship?: string | null;
  includeRowMappings?: boolean;
}): Promise<LinkedStudentsResult> {
  const [{ data: parentRows, error: parentError }, { data: links, error: linkError }] =
    await Promise.all([
      supabaseAdmin
        .from("parents")
        .select("id, profile_id")
        .eq("school_id", input.schoolId)
        .in("id", [input.parentRecordId]),
      supabaseAdmin
        .from("parent_students")
        .select("parent_id, student_id, relationship")
        .in("parent_id", [input.parentRecordId, input.parentProfileId]),
    ]);

  if (parentError) throw parentError;
  if (linkError) throw linkError;

  const studentIds = Array.from(
    new Set((links || []).map((row: any) => row.student_id).filter(Boolean))
  );

  let students: any[] = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id, profile_id, school_id, class_id, student_number")
      .eq("school_id", input.schoolId)
      .in("id", studentIds);

    if (error) throw error;
    students = data || [];
  }

  const mapped = buildParentLinkedStudentProfiles({
    actorProfileId: input.parentProfileId,
    actorSchoolId: input.schoolId,
    parents: parentRows || [],
    students,
    links: links || [],
  });

  const classIdByProfileId = new Map<string, string | null>();
  const studentNumberByProfileId = new Map<string, string | null>();

  for (const student of students) {
    const profileId = student.profile_id || student.id;
    if (!mapped.relationshipByProfileId.has(profileId)) continue;
    classIdByProfileId.set(profileId, student.class_id || null);
    studentNumberByProfileId.set(profileId, student.student_number || null);
  }

  if (mapped.profileIds.length > 0) {
    return {
      profileIds: mapped.profileIds,
      relationshipByProfileId: mapped.relationshipByProfileId,
      classIdByProfileId,
      studentNumberByProfileId,
      ...(input.includeRowMappings
        ? {
            studentRowIdByProfileId: mapped.studentRowIdByProfileId,
            profileIdByStudentRowId: mapped.profileIdByStudentRowId,
          }
        : {}),
    };
  }

  const fallbackRel = input.fallbackRelationship || null;

  const { data: legacyStudents, error: legacyError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("school_id", input.schoolId)
    .eq("parent_id", input.parentProfileId);

  if (legacyError) throw legacyError;

  const relationshipByProfileId = new Map<string, string | null>();
  const classIdByProfileIdLegacy = new Map<string, string | null>();
  const studentNumberByProfileIdLegacy = new Map<string, string | null>();

  const profileIds = (legacyStudents || []).map((row: any) => row.id);
  for (const profileId of profileIds) {
    relationshipByProfileId.set(profileId, fallbackRel);
    classIdByProfileIdLegacy.set(profileId, null);
    studentNumberByProfileIdLegacy.set(profileId, null);
  }

  return {
    profileIds,
    relationshipByProfileId,
    classIdByProfileId: classIdByProfileIdLegacy,
    studentNumberByProfileId: studentNumberByProfileIdLegacy,
    ...(input.includeRowMappings
      ? {
          studentRowIdByProfileId: new Map<string, string>(),
          profileIdByStudentRowId: new Map<string, string>(),
        }
      : {}),
  };
}

export async function getClassesById(schoolId: string | null, classIds: string[]) {
  if (!schoolId || classIds.length === 0) {
    return new Map<string, any>();
  }

  const legacy = await supabaseAdmin
    .from("classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (!legacy.error) {
    return new Map((legacy.data || []).map((row: any) => [row.id, row]));
  }

  const modern = await supabaseAdmin
    .from("classes")
    .select("id, name, grades(name, level)")
    .eq("school_id", schoolId)
    .in("id", classIds);

  if (modern.error) throw modern.error;

  return new Map((modern.data || []).map((row: any) => [row.id, row]));
}

export function buildClassLabel(classRow: any) {
  if (!classRow) return "Unassigned class";

  const gradeName =
    typeof classRow?.grades?.name === "string"
      ? classRow.grades.name.trim()
      : buildGradeLevelLabel(classRow?.grade_level);
  const className = typeof classRow?.name === "string" ? classRow.name.trim() : "";

  return [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
}

export function buildGradeLevelLabel(value: string | number | null | undefined) {
  const level = String(value || "").trim();
  return level ? `Grade ${level}` : "";
}

export function buildDisplayName(row: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.email ||
    "Student"
  );
}
