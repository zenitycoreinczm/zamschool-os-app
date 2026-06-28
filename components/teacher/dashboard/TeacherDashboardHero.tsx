import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StatCard, type StatTone } from "@/components/teacher/dashboard/StatCard";

type Stats = {
  lessons: number;
  students: number;
  completed: number;
  pending: number;
};

const heroStatItems = (
  stats: Stats,
): Array<{ key: string; label: string; value: number; Icon: typeof ClipboardList; tone: StatTone }> => [
  { key: "lessons", label: "Lessons Today", value: stats.lessons, Icon: ClipboardList, tone: "sky" },
  { key: "students", label: "Students", value: stats.students, Icon: Users, tone: "violet" },
  { key: "completed", label: "Completed", value: stats.completed, Icon: CheckCircle2, tone: "emerald" },
  { key: "pending", label: "Pending", value: stats.pending, Icon: TrendingUp, tone: "amber" },
];

const heroIconToneClass: Record<StatTone, string> = {
  sky: "text-sky-400",
  violet: "text-violet-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

export function TeacherDashboardHero({
  schoolName,
  displayName,
  yearTerm,
  stats,
  refreshing,
  onRefresh,
}: {
  schoolName: string;
  displayName: string;
  yearTerm: string;
  stats: Stats;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
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
            Welcome back, {displayName}. Your teaching overview for {yearTerm}.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
        >
          <Loader2 className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
        </button>
      </div>

      <div className="relative grid grid-cols-2 gap-2 border-t border-white/10 bg-black/15 p-3 backdrop-blur-sm md:grid-cols-4 md:gap-3 md:p-4">
        {heroStatItems(stats).map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition hover:bg-white/[0.10]"
          >
            <s.Icon className={cn("h-5 w-5 flex-shrink-0", heroIconToneClass[s.tone])} />
            <div className="min-w-0">
              <p className="ws-tabular text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
