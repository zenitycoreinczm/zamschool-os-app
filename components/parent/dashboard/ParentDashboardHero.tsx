import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  RANGE_OPTIONS,
  type ParentChildRow,
  type ParentRangeValue,
} from "@/components/parent/dashboard/types";

export function ParentDashboardHero({
  linkedChildren,
  range,
  onChangeRange,
  selectedChildId,
  onChangeChild,
  refreshing,
  error,
  onRefresh,
}: {
  linkedChildren: ParentChildRow[];
  range: ParentRangeValue;
  onChangeRange: (value: ParentRangeValue) => void;
  selectedChildId: string;
  onChangeChild: (value: string) => void;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <section
      aria-labelledby="parent-dashboard-hero-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Parent Dashboard
          </p>
          <h1
            id="parent-dashboard-hero-heading"
            className="mt-2 text-3xl font-semibold text-slate-900"
          >
            Lesson attendance for your linked children
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Review final attendance statuses by lesson, switch between linked
            children, and track the exact attendance window your school sees.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            <select
              value={selectedChildId}
              onChange={(event) => onChangeChild(event.target.value)}
              className="bg-transparent pr-6 text-sm text-slate-700 outline-none"
              aria-label="Select linked child"
            >
              <option value="all">All linked children</option>
              {linkedChildren.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.displayName}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-3"
        role="group"
        aria-label="Date range"
      >
        {RANGE_OPTIONS.map((option) => {
          const active = option.value === range;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChangeRange(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-sky-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}
