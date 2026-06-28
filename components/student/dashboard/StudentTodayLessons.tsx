import { formatTimeRange } from "@/components/student/dashboard/format";
import type { StudentLesson } from "@/components/student/dashboard/types";

export function StudentTodayLessons({ lessons }: { lessons: StudentLesson[] }) {
  return (
    <section
      aria-labelledby="student-today-lessons-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
        Today&apos;s Lessons
      </p>
      <h2
        id="student-today-lessons-heading"
        className="mt-1 text-2xl font-semibold text-slate-900"
      >
        Class schedule
      </h2>

      <div className="mt-5 space-y-3">
        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            No lessons are scheduled for today.
          </div>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-2xl border border-slate-200 px-4 py-4"
            >
              <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {lesson.teacherName} |{" "}
                {formatTimeRange(lesson.startTime, lesson.endTime)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
