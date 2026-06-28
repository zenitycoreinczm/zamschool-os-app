import Link from "next/link";
import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TeacherWorkloadSummary } from "@/lib/teacher-route-common";

type WorkloadKey = keyof TeacherWorkloadSummary;

type WorkloadCard = {
  label: string;
  key: WorkloadKey;
  icon: LucideIcon;
  tone: "sky" | "amber" | "violet" | "emerald";
  href: string;
};

const workloadCards: WorkloadCard[] = [
  {
    label: "Unread Messages",
    key: "unreadMessages",
    icon: MessageSquare,
    tone: "sky",
    href: "/app/teacher/inbox",
  },
  {
    label: "Pending Grades",
    key: "pendingGrades",
    icon: BookOpenCheck,
    tone: "amber",
    href: "/app/teacher/results",
  },
  {
    label: "Draft Results",
    key: "draftResults",
    icon: GraduationCap,
    tone: "violet",
    href: "/app/teacher/results",
  },
  {
    label: "Upcoming Events",
    key: "upcomingEvents",
    icon: CalendarDays,
    tone: "emerald",
    href: "/app/teacher/events",
  },
];

const tileRingClass: Record<WorkloadCard["tone"], string> = {
  sky: "bg-sky-50 text-sky-600 ring-sky-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
  violet: "bg-violet-50 text-violet-600 ring-violet-200",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

const tileTextClass: Record<WorkloadCard["tone"], string> = {
  sky: "text-sky-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
};

export function TeacherWorkload({ workload }: { workload: TeacherWorkloadSummary }) {
  return (
    <section
      aria-labelledby="teacher-workload-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Workload
      </p>
      <h2
        id="teacher-workload-heading"
        className="mt-1 text-xl font-semibold text-slate-900"
      >
        At a glance
      </h2>

      <div className="mt-5 flex flex-col gap-2">
        {workloadCards.map((card) => {
          const value = workload[card.key] ?? 0;
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
                    tileRingClass[card.tone],
                  )}
                >
                  <card.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-slate-700">{card.label}</p>
              </div>
              <p className={cn("ws-tabular text-lg font-bold", tileTextClass[card.tone])}>
                {value}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
