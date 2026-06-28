"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import { useTeacherWorkspace } from "@/components/TeacherWorkspaceProvider";
import { cn } from "@/lib/utils";

const teachingQuickLinks = [
  {
    label: "Take Attendance",
    href: "/app/teacher/attendance",
    icon: ClipboardList,
    tone: "amber",
    description: "Mark student attendance for today's lessons",
  },
  {
    label: "Record Results",
    href: "/app/teacher/results",
    icon: BookOpenCheck,
    tone: "violet",
    description: "Enter scores and grade assignments",
  },
  {
    label: "My Students",
    href: "/app/teacher/students",
    icon: Users,
    tone: "sky",
    description: "Browse your class roster and student profiles",
  },
  {
    label: "My Classes",
    href: "/app/teacher/classes",
    icon: GraduationCap,
    tone: "emerald",
    description: "View your assigned and supervised classes",
  },
  {
    label: "Discipline",
    href: "/app/teacher/discipline",
    icon: Shield,
    tone: "rose",
    description: "Log or review student conduct records",
  },
];

const STAT_LABELS: Record<string, string> = {
  lessons: "Lessons Today",
  students: "Students",
  completed: "Completed",
  pending: "Pending",
};

const STAT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  lessons: CalendarDays,
  students: Users,
  completed: BookOpenCheck,
  pending: ClipboardList,
};

const STAT_TONES: Record<string, string> = {
  lessons: "sky",
  students: "violet",
  completed: "emerald",
  pending: "amber",
};

export default function TeacherTeachingPage() {
  const {
    account,
    stats,
    workload,
    loading,
    error,
    displayName,
    schoolName,
    yearTerm,
  } = useTeacherWorkspace();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm font-medium text-slate-500">
            Loading your teaching workspace…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const assignedClasses = account?.teacher?.assignedClasses ?? [];
  const assignedSubjects = account?.teacher?.assignedSubjects ?? [];
  const supervisedClasses = account?.teacher?.supervisedClasses ?? [];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      {/* Hero */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm md:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Teaching workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          {schoolName}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Welcome back, {displayName}. Your teaching overview for {yearTerm}.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(stats) as Array<keyof typeof stats>).map((key) => {
          const Icon = STAT_ICONS[key] || CalendarDays;
          const tone = STAT_TONES[key] || "slate";
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-slate-900">
                  {stats[key]}
                </p>
                <Icon
                  className={cn(
                    "h-5 w-5",
                    tone === "sky" && "text-sky-500",
                    tone === "violet" && "text-violet-500",
                    tone === "emerald" && "text-emerald-500",
                    tone === "amber" && "text-amber-500",
                  )}
                />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {STAT_LABELS[key] || key}
              </p>
            </div>
          );
        })}
      </div>

      {/* Class & Subject assignment summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Assigned Classes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Assigned Classes
            </h2>
          </div>
          {assignedClasses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              No classes assigned yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {assignedClasses.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/teacher/students?class=${cls.id}`}
                  className="rounded-lg border border-slate-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:-translate-y-0.5"
                >
                  {cls.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Subjects */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Assigned Subjects
            </h2>
          </div>
          {assignedSubjects.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              No subjects assigned yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {assignedSubjects.map((subj) => (
                <Link
                  key={subj.id}
                  href={`/teacher/results?subject=${subj.id}`}
                  className="rounded-lg border border-slate-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:-translate-y-0.5"
                >
                  {subj.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workload summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Your Workload</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Unread Messages",
              value: workload.unreadMessages,
              href: "/app/teacher/inbox",
            },
            {
              label: "Notifications",
              value: workload.unreadNotifications,
              href: "/app/teacher/notifications",
            },
            {
              label: "Pending Grades",
              value: workload.pendingGrades,
              href: "/app/teacher/results",
            },
            {
              label: "Draft Results",
              value: workload.draftResults,
              href: "/app/teacher/results",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-xl font-bold text-slate-800">{item.value}</p>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Teacher profile summary */}
      {account?.teacher && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Your Profile</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
            {account.teacher.employeeId && (
              <div>
                <p className="text-xs text-slate-400">Employee ID</p>
                <p className="font-medium text-slate-700">
                  {account.teacher.employeeId}
                </p>
              </div>
            )}
            {account.teacher.department && (
              <div>
                <p className="text-xs text-slate-400">Department</p>
                <p className="font-medium text-slate-700">
                  {account.teacher.department}
                </p>
              </div>
            )}
            {account.teacher.specialization && (
              <div>
                <p className="text-xs text-slate-400">Specialization</p>
                <p className="font-medium text-slate-700">
                  {account.teacher.specialization}
                </p>
              </div>
            )}
            {supervisedClasses.length > 0 && (
              <div>
                <p className="text-xs text-slate-400">Supervised Classes</p>
                <p className="font-medium text-slate-700">
                  {supervisedClasses.map((c) => c.name).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachingQuickLinks.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  "mb-3 inline-flex rounded-lg p-2.5",
                  action.tone === "amber" &&
                    "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
                  action.tone === "violet" &&
                    "bg-violet-100 text-violet-600 group-hover:bg-violet-200",
                  action.tone === "sky" &&
                    "bg-sky-100 text-sky-600 group-hover:bg-sky-200",
                  action.tone === "emerald" &&
                    "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
                  action.tone === "rose" &&
                    "bg-rose-100 text-rose-600 group-hover:bg-rose-200",
                )}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {action.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
