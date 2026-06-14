type MaybeString = string | null | undefined;

type TeacherRow = {
  id: string;
  profile_id?: string | null;
};

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  name?: string | null;
};

type StudentRow = {
  id: string;
  profile_id?: string | null;
  school_id?: string | null;
};

type ParentRow = {
  id: string;
  profile_id?: string | null;
};

type ParentStudentLinkRow = {
  parent_id?: string | null;
  student_id?: string | null;
  relationship?: string | null;
};

type LessonRowInput = {
  id: string;
  title?: string | null;
  class_id?: string | null;
  subject_id?: string | null;
  teacher_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

function getDisplayName(profile: ProfileRow | undefined): string {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.name ||
    profile?.email ||
    "User"
  );
}

export function buildAcademicContextLabel(yearName?: MaybeString, termName?: MaybeString) {
  const parts = [yearName, termName].filter((value) => Boolean(String(value || "").trim()));
  return parts.length ? parts.join(" - ") : "Academic Context";
}

export function buildTeacherDirectory(teachers: TeacherRow[], profiles: ProfileRow[]) {
  const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const options = teachers.map((teacher) => ({
    id: teacher.id,
    label: getDisplayName(profileById[teacher.profile_id || ""]),
  }));
  const nameByTeacherId = Object.fromEntries(options.map((option) => [option.id, option.label]));
  return { options, nameByTeacherId };
}

export function buildTeacherActorIds(input: {
  actorProfileId: string;
  teachers: TeacherRow[];
}) {
  const actorIds = new Set<string>();
  if (input.actorProfileId) {
    actorIds.add(input.actorProfileId);
  }

  for (const teacher of input.teachers) {
    if (teacher.profile_id === input.actorProfileId && teacher.id) {
      actorIds.add(teacher.id);
    }
  }

  return Array.from(actorIds);
}

export function buildParentLinkedStudentProfiles(input: {
  actorProfileId: string;
  actorSchoolId: string | null;
  parents: ParentRow[];
  students: StudentRow[];
  links: ParentStudentLinkRow[];
}) {
  if (!input.actorProfileId || !input.actorSchoolId) {
    return {
      profileIds: [] as string[],
      relationshipByProfileId: new Map<string, string | null>(),
      studentRowIdByProfileId: new Map<string, string>(),
      profileIdByStudentRowId: new Map<string, string>(),
    };
  }

  const allowedParentIds = new Set<string>([input.actorProfileId]);
  for (const parent of input.parents) {
    if (parent.profile_id === input.actorProfileId && parent.id) {
      allowedParentIds.add(parent.id);
    }
  }

  const studentsByRowId = new Map(
    input.students.map((student) => [student.id, student])
  );
  const relationshipByProfileId = new Map<string, string | null>();
  const studentRowIdByProfileId = new Map<string, string>();
  const profileIdByStudentRowId = new Map<string, string>();

  for (const link of input.links) {
    if (!link.parent_id || !allowedParentIds.has(link.parent_id) || !link.student_id) {
      continue;
    }

    const student = studentsByRowId.get(link.student_id);
    const profileId = student?.profile_id || student?.id || null;
    if (!profileId || student?.school_id !== input.actorSchoolId) {
      continue;
    }

    relationshipByProfileId.set(profileId, link.relationship || null);
    studentRowIdByProfileId.set(profileId, student.id);
    profileIdByStudentRowId.set(student.id, profileId);
  }

  return {
    profileIds: Array.from(relationshipByProfileId.keys()),
    relationshipByProfileId,
    studentRowIdByProfileId,
    profileIdByStudentRowId,
  };
}

export function normalizeTimeValue(value?: MaybeString) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.slice(0, 5);
}

export function buildAttendanceSessionKey(input: {
  classId?: MaybeString;
  studentId?: MaybeString;
  sessionName?: MaybeString;
  sessionTime?: MaybeString;
}) {
  return [
    String(input.classId || "").trim(),
    String(input.studentId || "").trim(),
    String(input.sessionName || "").trim().toLowerCase(),
    normalizeTimeValue(input.sessionTime),
  ].join(":");
}

function formatTimeRange(startTime?: MaybeString, endTime?: MaybeString) {
  const start = String(startTime || "").slice(0, 5);
  const end = String(endTime || "").slice(0, 5);
  if (start && end) return `${start} - ${end}`;
  return start || end || "-";
}

export function mapLessonRows(
  lessons: LessonRowInput[],
  classMap: Record<string, string>,
  subjectMap: Record<string, string>,
  teacherMap: Record<string, string>
) {
  return lessons.map((lesson) => ({
    ...lesson,
    class: classMap[lesson.class_id || ""] || "-",
    subject: subjectMap[lesson.subject_id || ""] || "-",
    teacher: teacherMap[lesson.teacher_id || ""] || "-",
    time: formatTimeRange(lesson.start_time, lesson.end_time),
  }));
}
