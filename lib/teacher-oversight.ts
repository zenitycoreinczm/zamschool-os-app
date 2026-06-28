import { buildAttendanceSessionKey } from "./live-schema-adapters";

type LessonRow = {
  id?: string | null;
  classId?: string | null;
  className?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  title?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
};

type SupervisedClassRow = {
  id?: string | null;
  name?: string | null;
};

type AttendanceRow = {
  id?: string | null;
  date?: string | null;
  status?: string | null;
  classId?: string | null;
  sessionName?: string | null;
  sessionTime?: string | null;
  createdAt?: string | null;
};

type AssignmentRow = {
  id?: string | null;
  title?: string | null;
  classId?: string | null;
  className?: string | null;
  subjectName?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
};

type ResultRow = {
  id?: string | null;
  assignmentId?: string | null;
  subjectName?: string | null;
  studentName?: string | null;
  score?: number | null;
  grade?: string | null;
  createdAt?: string | null;
};

export function buildTeacherTenure(hireDate?: string | null, now = new Date()) {
  if (!hireDate) {
    return {
      label: null,
      days: null,
    };
  }

  const start = new Date(`${hireDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return {
      label: null,
      days: null,
    };
  }

  const diffMs = now.getTime() - start.getTime();
  const days = Math.max(Math.floor(diffMs / (24 * 60 * 60 * 1000)), 0);
  if (days < 30) {
    return { label: `${days} day${days === 1 ? "" : "s"}`, days };
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return { label: `${months} month${months === 1 ? "" : "s"}`, days };
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return {
    label: remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} year${years === 1 ? "" : "s"}`,
    days,
  };
}

export function buildTeacherOversightDossier(input: {
  todayDate: string;
  todayLessonDayOfWeek: number;
  supervisedClasses: SupervisedClassRow[];
  lessons: LessonRow[];
  attendanceRows: AttendanceRow[];
  assignments: AssignmentRow[];
  results: ResultRow[];
}) {
  const teachingClassMap = new Map<string, { id: string; name: string }>();
  const subjectMap = new Map<string, { id: string; name: string }>();
  for (const lesson of input.lessons) {
    if (lesson.classId) {
      teachingClassMap.set(lesson.classId, {
        id: lesson.classId,
        name: lesson.className || "Class",
      });
    }
    if (lesson.subjectId) {
      subjectMap.set(lesson.subjectId, {
        id: lesson.subjectId,
        name: lesson.subjectName || lesson.title || "Subject",
      });
    }
  }

  const todayLessons = input.lessons.filter(
    (lesson) => lesson.dayOfWeek === input.todayLessonDayOfWeek
  );
  const todayLessonSessionKeys = new Set(
    todayLessons.map((lesson) =>
      buildTeacherSessionKey({
        classId: lesson.classId || "",
        sessionName: lesson.title || lesson.subjectName || "Lesson",
        sessionTime: lesson.startTime || null,
      })
    )
  );
  const completedTodaySessionKeys = new Set(
    input.attendanceRows
      .filter((row) => row.date === input.todayDate)
      .map((row) =>
        buildTeacherSessionKey({
          classId: row.classId || "",
          sessionName: row.sessionName || "Lesson",
          sessionTime: row.sessionTime || null,
        })
      )
  );

  const recentAttendance = sortByCreatedAt(
    (input.attendanceRows || []).map((row) => ({
      id: row.id || buildTeacherSessionKey({
        classId: row.classId || "",
        sessionName: row.sessionName || "Lesson",
        sessionTime: row.sessionTime || null,
      }),
      date: row.date || null,
      status: row.status || null,
      classId: row.classId || null,
      sessionName: row.sessionName || "Lesson",
      sessionTime: row.sessionTime || null,
      createdAt: row.createdAt || null,
    }))
  ).slice(0, 8);

  const recentAssignments = sortByCreatedAt(
    (input.assignments || []).map((row) => ({
      id: row.id || null,
      title: row.title || "Assignment",
      classId: row.classId || null,
      className: row.className || "Class",
      subjectName: row.subjectName || "Subject",
      dueDate: row.dueDate || null,
      createdAt: row.createdAt || null,
    }))
  ).slice(0, 8);

  const recentResults = sortByCreatedAt(
    (input.results || []).map((row) => ({
      id: row.id || null,
      assignmentId: row.assignmentId || null,
      subjectName: row.subjectName || "Subject",
      studentName: row.studentName || "Student",
      score: row.score ?? null,
      grade: row.grade || null,
      createdAt: row.createdAt || null,
    }))
  ).slice(0, 8);

  return {
    supervisedClasses: dedupeById(
      (input.supervisedClasses || []).map((row) => ({
        id: row.id || "",
        name: row.name || "Class",
      }))
    ),
    teachingClasses: Array.from(teachingClassMap.values()),
    assignedSubjects: Array.from(subjectMap.values()),
    stats: {
      supervisedClasses: dedupeById(input.supervisedClasses || []).length,
      teachingClasses: teachingClassMap.size,
      weeklyLessons: input.lessons.length,
      assignments: input.assignments.length,
      resultsEntered: input.results.length,
      attendanceRecords: input.attendanceRows.length,
      todayLessons: todayLessons.length,
      completedRollCalls: completedTodaySessionKeys.size,
      pendingRollCalls: Math.max(todayLessonSessionKeys.size - completedTodaySessionKeys.size, 0),
    },
    activity: {
      lastAttendanceAt: recentAttendance[0]?.createdAt || null,
      lastAssignmentAt: recentAssignments[0]?.createdAt || null,
      lastResultAt: recentResults[0]?.createdAt || null,
    },
    recentAttendance,
    recentAssignments,
    recentResults,
  };
}

function buildTeacherSessionKey(input: {
  classId: string;
  sessionName: string;
  sessionTime: string | null;
}) {
  return buildAttendanceSessionKey({
    classId: input.classId,
    studentId: "*",
    sessionName: input.sessionName,
    sessionTime: input.sessionTime,
  });
}

function sortByCreatedAt<T extends { createdAt?: string | null }>(rows: T[]) {
  return [...rows].sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
  );
}

function dedupeById<T extends { id?: string | null }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row.id || "").trim();
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}
