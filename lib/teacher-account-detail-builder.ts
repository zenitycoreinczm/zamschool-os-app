import {
  buildTeacherOversightDossier,
  buildTeacherTenure,
} from "./teacher-oversight.ts";

type TeacherAccountDetailInput = {
  baseProfile: Record<string, any>;
  teacherRecord: Record<string, any> | null;
  specializationRows: Array<Record<string, any>>;
  normalizedTeachingAssignments: Array<Record<string, any>>;
  supervisedClassRefs: Array<Record<string, any>>;
  directLessons: Array<Record<string, any>>;
  assignments: Array<Record<string, any>>;
  attendanceRows: Array<Record<string, any>>;
  resultRows: Array<Record<string, any>>;
  studentNamesById: Map<string, string>;
  classMap: Map<string, any>;
  subjectById: Map<string, any>;
  todayDate: string;
  todayLessonDayOfWeek: number;
};

export function buildTeacherAccountDetail(input: TeacherAccountDetailInput) {
  const assignmentById = new Map(
    (input.assignments || []).map((row: any) => [row.id, row])
  );
  const supervisedClassIds = Array.from(
    new Set((input.supervisedClassRefs || []).map((row: any) => row.id).filter(Boolean))
  );

  const oversight = buildTeacherOversightDossier({
    todayDate: input.todayDate,
    todayLessonDayOfWeek: input.todayLessonDayOfWeek,
    supervisedClasses: (input.supervisedClassRefs || []).map((row: any) => ({
      id: row.id,
      name: buildClassLabel(input.classMap.get(row.id || "") || row),
    })),
    lessons: (input.directLessons || []).map((lesson: any) => ({
      id: lesson.id,
      title:
        lesson.title ||
        input.subjectById.get(lesson.subject_id || "")?.name ||
        "Lesson",
      classId: lesson.class_id,
      className: buildClassLabel(input.classMap.get(lesson.class_id || "") || null),
      subjectId: lesson.subject_id,
      subjectName: input.subjectById.get(lesson.subject_id || "")?.name || null,
      dayOfWeek: lesson.day_of_week,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
    })),
    attendanceRows: (input.attendanceRows || []).map((row: any) => ({
      id: row.id,
      date: row.date || null,
      status: row.status || null,
      classId: row.class_id || null,
      sessionName: row.session_name || null,
      sessionTime: row.session_time || null,
      createdAt: row.created_at || null,
    })),
    assignments: (input.assignments || []).map((row: any) => ({
      id: row.id,
      title: row.title || "Assignment",
      classId: row.class_id,
      className: buildClassLabel(input.classMap.get(row.class_id || "") || null),
      subjectName: input.subjectById.get(row.subject_id || "")?.name || "Subject",
      dueDate: row.due_date || null,
      createdAt: row.created_at || null,
    })),
    results: (input.resultRows || []).map((row: any) => ({
      id: row.id,
      assignmentId: row.assignment_id || null,
      subjectName:
        input.subjectById.get(
          assignmentById.get(row.assignment_id || "")?.subject_id || ""
        )?.name || null,
      studentName: input.studentNamesById.get(row.student_id || "") || "Student",
      score: row.score ?? null,
      grade: row.grade || null,
      createdAt: row.created_at || null,
    })),
  });

  const tenure = buildTeacherTenure(input.teacherRecord?.hire_date || null);
  const directAssignedClasses = dedupeRowsById(
    (input.directLessons || []).map((lesson: any) => ({
      id: lesson.class_id || null,
      name: buildClassLabel(input.classMap.get(lesson.class_id || "") || null),
    }))
  );
  const directAssignedSubjects = dedupeRowsById(
    (input.directLessons || []).map((lesson: any) => ({
      id: lesson.subject_id || null,
      name: input.subjectById.get(lesson.subject_id || "")?.name || "Subject",
    }))
  );
  const normalizedAssignedClasses = dedupeRowsById(
    (input.normalizedTeachingAssignments || []).map((assignment: any) => ({
      id: assignment.class_id || null,
      name: buildClassLabel(input.classMap.get(assignment.class_id || "") || null),
    }))
  );
  const normalizedAssignedSubjects = dedupeRowsById([
    ...(input.specializationRows || []).map((row: any) => ({
      id: row.subject_id || null,
      name: input.subjectById.get(row.subject_id || "")?.name || "Subject",
    })),
    ...(input.normalizedTeachingAssignments || []).map((assignment: any) => ({
      id: assignment.subject_id || null,
      name: input.subjectById.get(assignment.subject_id || "")?.name || "Subject",
    })),
  ]);
  const specializationSubjectIds = Array.from(
    new Set(
      (input.specializationRows || [])
        .map((row: any) => String(row.subject_id || ""))
        .filter(Boolean)
    )
  );
  const teachingAssignments = (input.normalizedTeachingAssignments || []).map(
    (assignment: any) => ({
      classId: assignment.class_id || "",
      className: buildClassLabel(input.classMap.get(assignment.class_id || "") || null),
      subjectId: assignment.subject_id || "",
      subjectName:
        input.subjectById.get(assignment.subject_id || "")?.name || "Subject",
    })
  );
  const resolvedAssignedClasses = dedupeRowsById([
    ...normalizedAssignedClasses,
    ...directAssignedClasses,
  ]);
  const resolvedAssignedSubjects = dedupeRowsById([
    ...normalizedAssignedSubjects,
    ...directAssignedSubjects,
  ]);
  const specializationSummary =
    input.teacherRecord?.specialization ||
    buildTeacherSpecializationSummary(specializationSubjectIds, input.subjectById) ||
    null;

  return {
    ...input.baseProfile,
    employeeId:
      input.teacherRecord?.employee_id ||
      input.teacherRecord?.employee_number ||
      input.baseProfile.employee_id ||
      null,
    department: input.teacherRecord?.department || null,
    specialization: specializationSummary,
    hireDate: input.teacherRecord?.hire_date || null,
    tenure,
    specializationSubjectIds,
    teachingAssignments,
    supervisedClassIds,
    assignedClasses: resolvedAssignedClasses,
    assignedSubjects: resolvedAssignedSubjects,
    supervisedClasses: oversight.supervisedClasses,
    oversight,
    pendingRollCalls: oversight.stats.pendingRollCalls,
  };
}

function buildTeacherSpecializationSummary(
  subjectIds: string[],
  subjectMap: Map<string, any>
) {
  const names = subjectIds
    .map((subjectId) => String(subjectMap.get(subjectId)?.name || "").trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : null;
}

function buildClassLabel(classRow: any) {
  if (!classRow) return "Unassigned class";

  const className = typeof classRow?.name === "string" ? classRow.name.trim() : "";
  const gradeName =
    typeof classRow?.grades?.name === "string"
      ? classRow.grades.name.trim()
      : buildGradeLevelLabel(classRow?.grade_level || classRow?.grades?.level);

  return [gradeName, className].filter(Boolean).join(" - ") || className || "Class";
}

function buildGradeLevelLabel(value: string | number | null | undefined) {
  const level = String(value || "").trim();
  return level ? `Grade ${level}` : "";
}

function dedupeRowsById<T extends { id?: string | null }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row?.id || "").trim();
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}
