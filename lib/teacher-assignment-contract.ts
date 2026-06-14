type AssignmentValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: 400 | 404;
      error: string;
    };

type SchoolOwnedRow = {
  id: string;
  school_id?: string | null;
};

type TeacherProfileRow = {
  id: string;
  school_id?: string | null;
  role?: string | null;
};

type TeacherRow = {
  id: string;
  profile_id?: string | null;
  school_id?: string | null;
};

type LessonScheduleRow = {
  id?: string | null;
  class_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
};

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function isTeacherProfile(profile: TeacherProfileRow | undefined, schoolId: string) {
  return Boolean(
    profile?.id &&
      profile.school_id === schoolId &&
      normalizeRole(profile.role) === "TEACHER"
  );
}

function parseTimeToMinutes(value?: string | null) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function rangesOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
) {
  const startMinutesA = parseTimeToMinutes(startA);
  const endMinutesA = parseTimeToMinutes(endA);
  const startMinutesB = parseTimeToMinutes(startB);
  const endMinutesB = parseTimeToMinutes(endB);

  if (
    startMinutesA === null ||
    endMinutesA === null ||
    startMinutesB === null ||
    endMinutesB === null
  ) {
    return false;
  }

  return startMinutesA < endMinutesB && endMinutesA > startMinutesB;
}

export function normalizeAssignedTeacherProfileId(input: {
  teacherId: string | null | undefined;
  schoolId: string;
  teacherProfiles: TeacherProfileRow[];
  teacherRows?: TeacherRow[];
}) {
  const teacherId = String(input.teacherId || "").trim();
  if (!teacherId || !input.schoolId) {
    return null;
  }

  const teacherProfile = input.teacherProfiles.find((profile) => profile.id === teacherId);
  if (isTeacherProfile(teacherProfile, input.schoolId)) {
    return teacherProfile?.id || null;
  }

  const teacherRow = (input.teacherRows || []).find(
    (row) => row.id === teacherId && row.school_id === input.schoolId && row.profile_id
  );

  if (!teacherRow?.profile_id) {
    return null;
  }

  const rowProfile = input.teacherProfiles.find(
    (profile) => profile.id === teacherRow.profile_id
  );

  return isTeacherProfile(rowProfile, input.schoolId) ? rowProfile?.id || null : null;
}

export function buildTeacherConflictIds(input: {
  teacherProfileId: string;
  teacherRows?: TeacherRow[];
}) {
  const ids = new Set<string>();
  if (input.teacherProfileId) {
    ids.add(input.teacherProfileId);
  }

  for (const teacherRow of input.teacherRows || []) {
    if (teacherRow.id) {
      ids.add(teacherRow.id);
    }
    if (teacherRow.profile_id) {
      ids.add(teacherRow.profile_id);
    }
  }

  return Array.from(ids);
}

export function validateSupervisorAssignment(input: {
  schoolId: string;
  supervisorId: string | null | undefined;
  teacherProfiles: TeacherProfileRow[];
  teacherRows?: TeacherRow[];
}): AssignmentValidationResult<{ supervisorProfileId: string | null }> {
  const supervisorId = String(input.supervisorId || "").trim();
  if (!supervisorId) {
    return {
      ok: true,
      data: {
        supervisorProfileId: null,
      },
    };
  }

  const supervisorProfileId = normalizeAssignedTeacherProfileId({
    teacherId: supervisorId,
    schoolId: input.schoolId,
    teacherProfiles: input.teacherProfiles,
    teacherRows: input.teacherRows,
  });

  if (!supervisorProfileId) {
    return {
      ok: false,
      status: 400,
      error: "Supervisor must be an active teacher in this school",
    };
  }

  return {
    ok: true,
    data: {
      supervisorProfileId,
    },
  };
}

export function validateLessonAssignment(input: {
  schoolId: string;
  classRow: SchoolOwnedRow | null;
  subjectRow: SchoolOwnedRow | null;
  teacherId: string | null | undefined;
  teacherProfiles: TeacherProfileRow[];
  teacherRows?: TeacherRow[];
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): AssignmentValidationResult<{ teacherProfileId: string; teacherRowId: string }> {
  if (!input.classRow?.id || input.classRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    };
  }

  if (!input.subjectRow?.id || input.subjectRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Subject not found in this school",
    };
  }

  const teacherAssignment = normalizeAssignedTeacherReference({
    teacherId: input.teacherId,
    schoolId: input.schoolId,
    teacherProfiles: input.teacherProfiles,
    teacherRows: input.teacherRows,
  });

  if (!teacherAssignment) {
    return {
      ok: false,
      status: 400,
      error: "Teacher must be an active teacher in this school",
    };
  }

  const startMinutes = parseTimeToMinutes(input.startTime);
  const endMinutes = parseTimeToMinutes(input.endTime);
  if (
    startMinutes === null ||
    endMinutes === null ||
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 0 ||
    input.dayOfWeek > 6
  ) {
    return {
      ok: false,
      status: 400,
      error: "Lesson requires a valid day and time range",
    };
  }

  if (endMinutes <= startMinutes) {
    return {
      ok: false,
      status: 400,
      error: "Lesson end time must be after start time",
    };
  }

  return {
    ok: true,
    data: {
      teacherProfileId: teacherAssignment.teacherProfileId,
      teacherRowId: teacherAssignment.teacherRowId,
    },
  };
}

export function validateTeacherManagedAssignmentTarget(input: {
  schoolId: string;
  classId: string;
  subjectId: string;
  allowedClassIds: string[];
  classRow: SchoolOwnedRow | null;
  subjectRow: SchoolOwnedRow | null;
}): AssignmentValidationResult<{ classId: string; subjectId: string }> {
  if (!input.allowedClassIds.includes(input.classId)) {
    return {
      ok: false,
      status: 404,
      error: "Class not found or access denied",
    };
  }

  if (!input.classRow?.id || input.classRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Class not found or access denied",
    };
  }

  if (!input.subjectRow?.id || input.subjectRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Subject not found in this school",
    };
  }

  return {
    ok: true,
    data: {
      classId: input.classRow.id,
      subjectId: input.subjectRow.id,
    },
  };
}

export function validateAdminManagedAssignmentTarget(input: {
  schoolId: string;
  classRow: SchoolOwnedRow | null;
  subjectRow: SchoolOwnedRow | null;
  teacherId: string | null | undefined;
  teacherProfiles: TeacherProfileRow[];
  teacherRows?: TeacherRow[];
}): AssignmentValidationResult<{ classId: string; subjectId: string; teacherProfileId: string; teacherRowId: string }> {
  if (!input.classRow?.id || input.classRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    };
  }

  if (!input.subjectRow?.id || input.subjectRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Subject not found in this school",
    };
  }

  const teacherAssignment = normalizeAssignedTeacherReference({
    teacherId: input.teacherId,
    schoolId: input.schoolId,
    teacherProfiles: input.teacherProfiles,
    teacherRows: input.teacherRows,
  });

  if (!teacherAssignment) {
    return {
      ok: false,
      status: 400,
      error: "Teacher must be an active teacher in this school",
    };
  }

  return {
    ok: true,
    data: {
      classId: input.classRow.id,
      subjectId: input.subjectRow.id,
      teacherProfileId: teacherAssignment.teacherProfileId,
      teacherRowId: teacherAssignment.teacherRowId,
    },
  };
}

function normalizeAssignedTeacherReference(input: {
  teacherId: string | null | undefined;
  schoolId: string;
  teacherProfiles: TeacherProfileRow[];
  teacherRows?: TeacherRow[];
}) {
  const teacherId = String(input.teacherId || "").trim();
  if (!teacherId || !input.schoolId) {
    return null;
  }

  const teacherRowById = (input.teacherRows || []).find(
    (row) => row.id === teacherId && row.school_id === input.schoolId && row.profile_id
  );
  if (teacherRowById?.profile_id) {
    const rowProfile = input.teacherProfiles.find(
      (profile) => profile.id === teacherRowById.profile_id
    );
    if (rowProfile && isTeacherProfile(rowProfile, input.schoolId)) {
      return {
        teacherProfileId: rowProfile.id,
        teacherRowId: teacherRowById.id,
      };
    }
  }

  const teacherProfile = input.teacherProfiles.find((profile) => profile.id === teacherId);
  if (!isTeacherProfile(teacherProfile, input.schoolId)) {
    return null;
  }
  if (!teacherProfile) {
    return null;
  }

  const teacherRowByProfile = (input.teacherRows || []).find(
    (row) => row.profile_id === teacherProfile.id && row.school_id === input.schoolId && row.id
  );

  if (!teacherRowByProfile?.id) {
    return null;
  }

  return {
    teacherProfileId: teacherProfile.id,
    teacherRowId: teacherRowByProfile.id,
  };
}

export function findLessonSchedulingConflict(input: {
  candidate: LessonScheduleRow;
  lessons: LessonScheduleRow[];
  excludeLessonId?: string | null;
}) {
  const excludeLessonId = String(input.excludeLessonId || input.candidate.id || "").trim();

  for (const lesson of input.lessons) {
    if (!lesson?.id) {
      continue;
    }

    if (excludeLessonId && lesson.id === excludeLessonId) {
      continue;
    }

    if (lesson.day_of_week !== input.candidate.day_of_week) {
      continue;
    }

    if (
      !rangesOverlap(
        input.candidate.start_time,
        input.candidate.end_time,
        lesson.start_time,
        lesson.end_time
      )
    ) {
      continue;
    }

    if (
      input.candidate.class_id &&
      lesson.class_id &&
      lesson.class_id === input.candidate.class_id
    ) {
      return {
        lessonId: lesson.id,
        scope: "class" as const,
        error: "This class already has a lesson scheduled during that time",
      };
    }

    if (
      input.candidate.teacher_id &&
      lesson.teacher_id &&
      lesson.teacher_id === input.candidate.teacher_id
    ) {
      return {
        lessonId: lesson.id,
        scope: "teacher" as const,
        error: "This teacher is already scheduled to teach another class during that time",
      };
    }
  }

  return null;
}
