"use client";

import { BookOpen, Loader2 } from "lucide-react";

import { AlertCircle } from "lucide-react";

export function StudentDashboardHero({
  displayName,
  className,
  admissionNumber,
  refreshing,
  error,
  onRefresh,
}: {
  displayName: string;
  className: string;
  admissionNumber: string | null;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <section
      aria-labelledby="student-dashboard-hero-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Student Dashboard
          </p>
          <h1
            id="student-dashboard-hero-heading"
            className="mt-2 text-3xl font-semibold text-slate-900"
          >
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {className || "Class pending"}
            {admissionNumber ? ` | Admission ${admissionNumber}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          Refresh
        </button>
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
