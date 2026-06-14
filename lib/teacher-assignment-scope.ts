import { buildTeacherActorIds } from "./live-schema-adapters.js";

type TeacherRow = {
  id: string;
  profile_id?: string | null;
};

type ClassRow = {
  id: string;
  school_id?: string | null;
  supervisor_id?: string | null;
};

type LessonRow = {
  id?: string | null;
  school_id?: string | null;
  class_id?: string | null;
  teacher_id?: string | null;
};

type TeacherAssignmentRow = {
  class_id?: string | null;
  teacher_profile_id?: string | null;
  school_id?: string | null;
};

export type TeacherAssignmentScope = {
  actorTeacherIds: string[];
  supervisedClassIds: string[];
  taughtClassIds: string[];
  allowedClassIds: string[];
};

export function buildTeacherAssignmentScope(input: {
  actorProfileId: string;
  schoolId: string;
  teachers: TeacherRow[];
  classes: ClassRow[];
  lessons: LessonRow[];
  assignments?: TeacherAssignmentRow[];
}): TeacherAssignmentScope {
  const actorTeacherIds = buildTeacherActorIds({
    actorProfileId: input.actorProfileId,
    teachers: input.teachers,
  });

  const supervisedClassIds = uniqueValues(
    input.classes.flatMap((classRow) =>
      classRow.id &&
      classRow.school_id === input.schoolId &&
      actorTeacherIds.includes(String(classRow.supervisor_id || ""))
        ? [classRow.id]
        : []
    )
  );

  const taughtClassIds = uniqueValues(
    input.lessons.flatMap((lesson) =>
      lesson.class_id &&
      lesson.school_id === input.schoolId &&
      actorTeacherIds.includes(String(lesson.teacher_id || ""))
        ? [lesson.class_id]
        : []
    )
  );

  const assignedClassIds = uniqueValues(
    (input.assignments || []).flatMap((assignment) =>
      assignment.class_id &&
      (!assignment.school_id || assignment.school_id === input.schoolId) &&
      actorTeacherIds.includes(String(assignment.teacher_profile_id || ""))
        ? [assignment.class_id]
        : []
    )
  );

  return {
    actorTeacherIds,
    supervisedClassIds,
    taughtClassIds: uniqueValues([...taughtClassIds, ...assignedClassIds]),
    allowedClassIds: uniqueValues([...supervisedClassIds, ...taughtClassIds, ...assignedClassIds]),
  };
}

export function teacherHasClassAccess(
  scope: TeacherAssignmentScope,
  classId: string | null | undefined
) {
  const normalizedClassId = String(classId || "").trim();
  return normalizedClassId ? scope.allowedClassIds.includes(normalizedClassId) : false;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
