"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Surface } from "@/components/workspace/Surface";
import { WorkspaceLoader } from "@/components/workspace/WorkspaceLoader";
import { CalendarCheck, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  remarks: string;
  subjectName: string;
  className: string;
  teacherName: string;
  startTime: string | null;
  endTime: string | null;
};

type AttendanceSummary = {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  total: number;
  rate: number;
};

type AttendanceResponse = {
  success?: boolean;
  data?: {
    range: string;
    startDate: string;
    endDate: string;
    summary: AttendanceSummary;
    rows: AttendanceRow[];
    total: number;
  };
  error?: string;
};

const RANGE_OPTIONS = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
] as const;

const statusColors: Record<string, string> = {
  PRESENT: "border-emerald-300 bg-emerald-50 text-emerald-700",
  ABSENT: "border-rose-300 bg-rose-50 text-rose-700",
  LATE: "border-amber-300 bg-amber-50 text-amber-700",
  EXCUSED: "border-blue-300 bg-blue-50 text-blue-700",
};

export default function StudentAttendancePage() {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("1m");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAttendance = useCallback(async (forceRefresh: boolean) => {
    setError("");
    setLoading((c) => (forceRefresh ? c : true));
    setRefreshing(forceRefresh);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const query = new URLSearchParams({ range });
      const res = await fetch(`/api/student/attendance?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load attendance");
      }

      const body: AttendanceResponse = await res.json();
      const data = body.data;
      setRows(data?.rows || []);
      setSummary(data?.summary || null);
      setTotal(data?.total || 0);
      setStartDate(data?.startDate || "");
      setEndDate(data?.endDate || "");
    } catch (loadError: unknown) {
      setRows([]);
      setSummary(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    void loadAttendance(false);
  }, [loadAttendance]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label || "1 month";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Student Attendance
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Your attendance record
            </h1>
            {startDate && endDate && (
              <p className="mt-2 text-sm text-slate-500">
                {formatDateShort(startDate)} &mdash; {formatDateShort(endDate)} &middot; {rangeLabel}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadAttendance(true)}
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

        <div className="mt-5 flex flex-wrap gap-3">
          {RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-sky-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {loading ? (
        <section className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mb-3 h-5 w-5 animate-spin" />
          Loading attendance...
        </section>
      ) : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                { label: "Present", value: summary.PRESENT, color: "bg-emerald-500" },
                { label: "Absent", value: summary.ABSENT, color: "bg-rose-500" },
                { label: "Late", value: summary.LATE, color: "bg-amber-500" },
                { label: "Excused", value: summary.EXCUSED, color: "bg-blue-500" },
                { label: "Rate", value: `${summary.rate}%`, color: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className={cn("mx-auto mb-2 h-2 w-12 rounded-full", item.color)} />
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <Surface variant="elevated" className="p-8 text-center">
              <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No attendance records for this period.</p>
            </Surface>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Teacher</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-4 py-3 text-slate-900">{formatDateShort(row.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.subjectName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.teacherName}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.startTime && row.endTime
                          ? `${row.startTime} - ${row.endTime}`
                          : row.startTime || "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            statusColors[row.status] || "border-slate-200 bg-white text-slate-600"
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{row.remarks || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return format(date, "MMM d, yyyy");
}
