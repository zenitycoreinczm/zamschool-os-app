"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  Loader2,
  Megaphone,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useTeacherWorkspace } from "@/components/TeacherWorkspaceProvider";
import { adminApiJson } from "@/lib/admin-browser-api";
import { formatDate, cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────

type LessonRow = {
  id: string;
  date: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  startTime: string;
  endTime: string;
  rosterCount: number;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  authorName: string | null;
  createdAt: string;
  priority: string | null;
};

// ─── stat card ────────────────────────────────────────────────────────

const statTone = {
  sky: "bg-sky-50 text-sky-600 ring-sky-200",
  violet: "bg-violet-50 text-violet-600 ring-violet-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  rose: "bg-rose-50 text-rose-600 ring-rose-200",
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof statTone;
  href?: string;
}) {
  const body = (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
          statTone[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="ws-tabular text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
  if (href) {
    return <Link href={href}>{body}</Link>;
  }
  return body;
}

// ─── profile field ────────────────────────────────────────────────────

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

// ─── priority badge ───────────────────────────────────────────────────

const priorityBadge: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700",
  high: "bg-amber-100 text-amber-700",
  normal: "bg-sky-100 text-sky-700",
  low: "bg-slate-100 text-slate-500",
};

// ─── main page ────────────────────────────────────────────────────────

export default function TeacherDashboardPage() {
  const {
    account,
    stats,
    workload,
    loading: wsLoading,
    error: wsError,
    displayName,
    schoolName,
    yearTerm,
    refresh,
  } = useTeacherWorkspace();

  // additional data
  const [todayLessons, setTodayLessons] = useState<LessonRow[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<
    AnnouncementRow[]
  >([]);
  const [pageLoading, setPageLoading] = useState(true);

  const loadExtra = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [lessonsRes, annRes] = await Promise.allSettled([
        adminApiJson<{ success: boolean; data: LessonRow[] }>(
          `/api/teacher/classes?date=${today}&limit=6`,
        ),
        adminApiJson<{ success: boolean; data: AnnouncementRow[] }>(
          "/api/teacher/announcements?limit=2",
        ),
      ]);

      if (lessonsRes.status === "fulfilled" && lessonsRes.value?.data) {
        setTodayLessons(
          Array.isArray(lessonsRes.value.data) ? lessonsRes.value.data : [],
        );
      }
      if (annRes.status === "fulfilled" && annRes.value?.data) {
        setRecentAnnouncements(
          Array.isArray(annRes.value.data) ? annRes.value.data : [],
        );
      }
    } catch {
      // non-critical, keep defaults
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!wsLoading) {
      void loadExtra();
      setPageLoading(false);
    }
  }, [wsLoading, loadExtra]);

  // ── loading ────────────────────────────────────────────────────────

  if (wsLoading || pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4 md:p-6">
        <section className="grid w-full max-w-lg place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 shadow-sm">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">
            Loading your workspace…
          </p>
        </section>
      </div>
    );
  }

  // ── error ───────────────────────────────────────────────────────────

  if (wsError) {
    return (
      <div className="p-4 md:p-6">
        <section className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-rose-500" />
          <p className="text-sm font-medium text-rose-700">{wsError}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
          >
            <Loader2 className="h-4 w-4" /> Try again
          </button>
        </section>
      </div>
    );
  }

  // ── derived ─────────────────────────────────────────────────────────

  const hasAttention =
    workload.unreadMessages > 0 || workload.unreadNotifications > 0;
  const todayCount = todayLessons.length;
  const totalRoster = todayLessons.reduce((s, l) => s + l.rosterCount, 0);
  const upcomingEvents = workload.upcomingEvents ?? 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ══════ Hero ══════ */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/40 bg-gradient-to-br from-slate-800 via-slate-800 to-amber-900 text-white shadow-lg">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-[-2rem] h-72 w-72 rounded-full bg-amber-500/8 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between lg:p-7">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Teacher workspace
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-[1.65rem] lg:text-[1.75rem]">
              {schoolName}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300/90">
              Welcome back, {displayName}. Your teaching overview for {yearTerm}
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              refresh();
              void loadExtra();
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <Loader2 className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* hero stat strip */}
        <div className="relative grid grid-cols-2 gap-2 border-t border-white/10 bg-black/15 p-3 backdrop-blur-sm md:grid-cols-4 md:gap-3 md:p-4">
          {[
            {
              l: "Lessons Today",
              v: stats.lessons,
              i: ClipboardList,
              t: "sky",
            },
            { l: "Students", v: stats.students, i: Users, t: "violet" },
            {
              l: "Completed",
              v: stats.completed,
              i: CheckCircle2,
              t: "emerald",
            },
            { l: "Pending", v: stats.pending, i: TrendingUp, t: "amber" },
          ].map((s) => (
            <div
              key={s.l}
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition hover:bg-white/[0.10]"
            >
              <s.i
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  s.t === "sky" && "text-sky-400",
                  s.t === "violet" && "text-violet-400",
                  s.t === "emerald" && "text-emerald-400",
                  s.t === "amber" && "text-amber-400",
                )}
              />
              <div className="min-w-0">
                <p className="ws-tabular text-lg font-bold">{s.v}</p>
                <p className="text-xs text-slate-400">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ Needs attention ══════ */}
      {hasAttention ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">Needs your attention:</span>
          {workload.unreadMessages > 0 ? (
            <Link
              href="/teacher/inbox"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
            >
              <MessageSquare className="h-3 w-3" />
              {workload.unreadMessages} message
              {workload.unreadMessages !== 1 ? "s" : ""}
            </Link>
          ) : null}
          {workload.unreadNotifications > 0 ? (
            <Link
              href="/teacher/notifications"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
            >
              <Bell className="h-3 w-3" />
              {workload.unreadNotifications} notification
              {workload.unreadNotifications !== 1 ? "s" : ""}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ══════ Quick actions ══════ */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Quick actions
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          What would you like to do?
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Take Attendance",
              href: "/teacher/attendance",
              icon: ClipboardList,
              tone: "amber",
              desc: "Mark student attendance for today's lessons",
            },
            {
              label: "Record Results",
              href: "/teacher/results",
              icon: GraduationCap,
              tone: "violet",
              desc: "Enter scores and grade assignments",
            },
            {
              label: "View Students",
              href: "/teacher/students",
              icon: Users,
              tone: "sky",
              desc: "Browse your class roster and student profiles",
            },
            {
              label: "Discipline",
              href: "/teacher/discipline",
              icon: Shield,
              tone: "rose",
              desc: "Log or review student conduct records",
            },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  "mb-3 inline-flex rounded-xl p-2.5 ring-1 ring-inset",
                  a.tone === "amber" &&
                    "bg-amber-50 text-amber-600 ring-amber-200 group-hover:bg-amber-100",
                  a.tone === "violet" &&
                    "bg-violet-50 text-violet-600 ring-violet-200 group-hover:bg-violet-100",
                  a.tone === "sky" &&
                    "bg-sky-50 text-sky-600 ring-sky-200 group-hover:bg-sky-100",
                  a.tone === "rose" &&
                    "bg-rose-50 text-rose-600 ring-rose-200 group-hover:bg-rose-100",
                )}
              >
                <a.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{a.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════ Today's Schedule ══════ */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Today
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Your schedule
            </h2>
            {todayCount > 0 ? (
              <p className="mt-1 text-sm text-slate-500">
                {todayCount} lesson{todayCount !== 1 ? "s" : ""} · {totalRoster}{" "}
                student{totalRoster !== 1 ? "s" : ""} on roster
              </p>
            ) : null}
          </div>
          <Link
            href="/teacher/classes"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <CalendarDays className="h-3.5 w-3.5" /> View all
          </Link>
        </div>

        {todayLessons.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              No lessons scheduled for today
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Enjoy your day or check your timetable for upcoming classes.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {todayLessons.slice(0, 6).map((lesson) => (
              <Link
                key={lesson.id}
                href={`/teacher/attendance?date=${lesson.date}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">
                  {lesson.subjectName}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {lesson.className}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.startTime?.slice(0, 5)} –{" "}
                    {lesson.endTime?.slice(0, 5)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {lesson.rosterCount} students
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════ Announcements ══════ */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Announcements
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Latest updates
            </h2>
          </div>
          <Link
            href="/teacher/announcements"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Megaphone className="h-3.5 w-3.5" /> View all
          </Link>
        </div>

        {recentAnnouncements.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              No recent announcements
            </p>
            <p className="mt-1 text-xs text-slate-400">
              School-wide announcements will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {recentAnnouncements.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  {a.priority && priorityBadge[a.priority] ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        priorityBadge[a.priority],
                      )}
                    >
                      {a.priority}
                    </span>
                  ) : null}
                </div>
                {a.body ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {a.body}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-400">
                  {a.authorName ? `By ${a.authorName} · ` : ""}
                  {formatDate(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════ Stats + Profile ══════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* workload + upcoming */}
        <section className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workload
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            At a glance
          </h2>

          <div className="mt-5 flex flex-col gap-2">
            {[
              {
                label: "Unread Messages",
                key: "unreadMessages",
                icon: MessageSquare,
                tone: "sky",
                href: "/teacher/inbox",
              },
              {
                label: "Pending Grades",
                key: "pendingGrades",
                icon: BookOpenCheck,
                tone: "amber",
                href: "/teacher/results",
              },
              {
                label: "Draft Results",
                key: "draftResults",
                icon: GraduationCap,
                tone: "violet",
                href: "/teacher/results",
              },
              {
                label: "Upcoming Events",
                key: "upcomingEvents",
                icon: CalendarDays,
                tone: "emerald",
                href: "/teacher/events",
              },
            ].map((card) => {
              const key = card.key as keyof typeof workload;
              const value = workload[key] ?? 0;
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl ring-1 ring-inset",
                        card.tone === "sky" &&
                          "bg-sky-50 text-sky-600 ring-sky-200",
                        card.tone === "amber" &&
                          "bg-amber-50 text-amber-600 ring-amber-200",
                        card.tone === "violet" &&
                          "bg-violet-50 text-violet-600 ring-violet-200",
                        card.tone === "emerald" &&
                          "bg-emerald-50 text-emerald-600 ring-emerald-200",
                      )}
                    >
                      <card.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {card.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "ws-tabular text-lg font-bold",
                      card.tone === "sky" && "text-sky-600",
                      card.tone === "amber" && "text-amber-600",
                      card.tone === "violet" && "text-violet-600",
                      card.tone === "emerald" && "text-emerald-600",
                    )}
                  >
                    {value}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* teaching profile */}
        {account?.teacher ? (
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Your profile
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Teaching details
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
              {[
                { label: "Employee ID", value: account.teacher.employeeId },
                { label: "Department", value: account.teacher.department },
                {
                  label: "Specialization",
                  value: account.teacher.specialization,
                },
                { label: "Hire date", value: account.teacher.hireDate },
                { label: "Tenure", value: account.teacher.tenure?.label },
                {
                  label: "Classes",
                  value: account.teacher.assignedClasses
                    ?.map((c) => c.name)
                    .join(", "),
                },
                {
                  label: "Subjects",
                  value: account.teacher.assignedSubjects
                    ?.map((s) => s.name)
                    .join(", "),
                },
                {
                  label: "Supervised",
                  value: account.teacher.supervisedClasses
                    ?.map((c) => c.name)
                    .join(", "),
                },
              ]
                .filter((f) => f.value)
                .map((f) => (
                  <ProfileField
                    key={f.label}
                    label={f.label}
                    value={f.value!}
                  />
                ))}
            </div>
          </section>
        ) : (
          <section className="lg:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                Teaching profile not yet configured
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Contact your school administrator to set up your teaching
                assignment profile.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
