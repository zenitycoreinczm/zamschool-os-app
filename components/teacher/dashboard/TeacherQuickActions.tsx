import Link from "next/link";
import {
  ClipboardList,
  GraduationCap,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: "amber" | "violet" | "sky" | "rose";
  desc: string;
};

const quickActions: QuickAction[] = [
  {
    label: "Take Attendance",
    href: "/app/teacher/attendance",
    icon: ClipboardList,
    tone: "amber",
    desc: "Mark student attendance for today's lessons",
  },
  {
    label: "Record Results",
    href: "/app/teacher/results",
    icon: GraduationCap,
    tone: "violet",
    desc: "Enter scores and grade assignments",
  },
  {
    label: "View Students",
    href: "/app/teacher/students",
    icon: Users,
    tone: "sky",
    desc: "Browse your class roster and student profiles",
  },
  {
    label: "Discipline",
    href: "/app/teacher/discipline",
    icon: Shield,
    tone: "rose",
    desc: "Log or review student conduct records",
  },
];

const toneClass: Record<QuickAction["tone"], string> = {
  amber: "bg-amber-50 text-amber-600 ring-amber-200 group-hover:bg-amber-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-200 group-hover:bg-violet-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-200 group-hover:bg-sky-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-200 group-hover:bg-rose-100",
};

export function TeacherQuickActions() {
  return (
    <section
      aria-labelledby="teacher-quick-actions-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Quick actions
      </p>
      <h2
        id="teacher-quick-actions-heading"
        className="mt-1 text-xl font-semibold text-slate-900"
      >
        What would you like to do?
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={cn(
                "mb-3 inline-flex rounded-xl p-2.5 ring-1 ring-inset",
                toneClass[action.tone],
              )}
            >
              <action.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{action.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
