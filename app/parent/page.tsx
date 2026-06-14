"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

import Announcements from "@/components/Announcements";
import ParentAttendanceSummary from "@/components/ParentAttendanceSummary";
import ParentChildAttendanceTable from "@/components/ParentChildAttendanceTable";
import { fetchGatewayRead } from "@/lib/gateway-read-client";
import { formatLocalDateInputValue } from "@/lib/local-date";

const RANGE_OPTIONS = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
] as const;

type AttendanceSummary = {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
};

type ParentChildRow = {
  id: string;
  displayName: string;
  admissionNumber: string | null;
  classId: string | null;
  className: string;
  relationship: string | null;
  email?: string | null;
  summary?: AttendanceSummary;
};

type ParentAttendanceRow = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  studentId: string;
  studentName: string;
  admissionNumber: string | null;
  lessonId: string | null;
  subjectName: string;
  subjectCode: string | null;
  classId: string | null;
  className: string;
  teacherName: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
};

type ParentChildrenResponse = {
  success?: boolean;
  data?: ParentChildRow[];
  error?: string;
};

type ParentAttendanceResponse = {
  success?: boolean;
  data?: {
    range: string;
    startDate: string;
    endDate: string;
    summary: AttendanceSummary;
    children: ParentChildRow[];
    rows: ParentAttendanceRow[];
  };
  error?: string;
};

type ParentResultRow = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  subjectName: string;
  className: string;
  score: number | null;
  grade: string | null;
  publishedAt: string | null;
};

type ParentResultsResponse = {
  success?: boolean;
  data?: ParentResultRow[];
  error?: string;
};

const EMPTY_SUMMARY: AttendanceSummary = {
  PRESENT: 0,
  ABSENT: 0,
  LATE: 0,
  EXCUSED: 0,
};

export default function ParentDashboard() {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("1m");
  const [selectedChildId, setSelectedChildId] = useState("all");
  const [children, setChildren] = useState<ParentChildRow[]>([]);
  const [attendance, setAttendance] = useState<ParentAttendanceResponse["data"] | null>(null);
  const [results, setResults] = useState<ParentResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    void loadChildren();
  }, []);

  useEffect(() => {
    if (!children.length) {
      return;
    }

    const childExists =
      selectedChildId === "all" || children.some((child) => child.id === selectedChildId);

    if (!childExists) {
      setSelectedChildId("all");
    }
  }, [children, selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  );

  const summaryHeading = selectedChild
    ? `${selectedChild.displayName} attendance`
    : children.length > 1
      ? "Combined family attendance"
      : "Attendance overview";

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label || "1 month";

  const childSummaries = attendance?.children || [];

  async function loadChildren() {
    try {
      const response = await fetchGatewayRead("/api/parent/children", {
        cache: "no-store",
        fallbackToLocal: true,
      });
      const payload = (await response.json()) as ParentChildrenResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load linked children");
      }

      setChildren(payload.data || []);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load linked children"
      );
      setChildren([]);
    }
  }

  const loadAttendance = useCallback(async (forceRefresh: boolean) => {
    setError("");
    setLoading((current) => (forceRefresh ? current : true));
    setRefreshing(forceRefresh);

    try {
      const query = new URLSearchParams({ range });
      if (selectedChildId !== "all") {
        query.set("studentId", selectedChildId);
      }

      const response = await fetchGatewayRead(`/api/parent/attendance?${query.toString()}`, {
        cache: "no-store",
        fallbackToLocal: true,
      });
      const payload = (await response.json()) as ParentAttendanceResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load attendance");
      }

      setAttendance(payload.data || null);
    } catch (loadError: unknown) {
      setAttendance(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load attendance"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, selectedChildId]);

  const loadResults = useCallback(async (forceRefresh = false) => {
    setResultsError("");
    setResultsLoading(true);
    if (forceRefresh) {
      setRefreshing(true);
    }

    try {
      const query = new URLSearchParams();
      if (selectedChildId !== "all") {
        query.set("studentId", selectedChildId);
      }

      const response = await fetchGatewayRead(`/api/parent/results?${query.toString()}`, {
        cache: "no-store",
        fallbackToLocal: true,
      });
      const payload = (await response.json()) as ParentResultsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load published results");
      }

      setResults(payload.data || []);
    } catch (loadError: unknown) {
      setResults([]);
      setResultsError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load published results"
      );
    } finally {
      setResultsLoading(false);
      if (forceRefresh) {
        setRefreshing(false);
      }
    }
  }, [selectedChildId]);

  useEffect(() => {
    void loadAttendance(false);
  }, [loadAttendance]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Parent Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
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
                onChange={(event) => setSelectedChildId(event.target.value)}
                className="bg-transparent pr-6 text-sm text-slate-700 outline-none"
              >
                <option value="all">All linked children</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.displayName}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                void loadAttendance(true);
                void loadResults(true);
              }}
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

        <div className="mt-6 flex flex-wrap gap-3">
          {RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-sky-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mb-3 h-5 w-5 animate-spin" />
          Loading parent attendance...
        </section>
      ) : (
        <>
          <ParentAttendanceSummary
            summary={attendance?.summary || EMPTY_SUMMARY}
            heading={summaryHeading}
            rangeLabel={selectedRangeLabel}
            startDate={attendance?.startDate || formatLocalDateInputValue()}
            endDate={attendance?.endDate || formatLocalDateInputValue()}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-sky-600" />
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                      Linked Children
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                      {children.length === 0
                        ? "No linked children yet"
                        : `${children.length} linked child${children.length === 1 ? "" : "ren"}`}
                    </h2>
                  </div>
                </div>

                {children.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    Parent attendance will appear here once an admin links your account to at
                    least one student profile.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {children.map((child) => {
                      const summary =
                        childSummaries.find((item) => item.id === child.id)?.summary ||
                        child.summary ||
                        EMPTY_SUMMARY;
                      const isActive =
                        selectedChildId === "all" ? false : selectedChildId === child.id;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedChildId(child.id)}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            isActive
                              ? "border-sky-300 bg-sky-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {child.displayName}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {child.className}
                                {child.relationship ? ` | ${child.relationship}` : ""}
                              </p>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              Present: <span className="font-semibold text-slate-900">{summary.PRESENT}</span>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              Absent: <span className="font-semibold text-slate-900">{summary.ABSENT}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <ParentChildAttendanceTable rows={attendance?.rows || []} />

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-sky-600" />
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                      Published Results
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                      Academic updates for linked children
                    </h2>
                  </div>
                </div>

                {resultsLoading ? (
                  <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
                    <Loader2 className="mb-3 h-5 w-5 animate-spin" />
                    Loading published results...
                  </div>
                ) : resultsError ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {resultsError}
                  </div>
                ) : results.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    No published results are available for the selected child yet.
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200 text-left text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-medium">Child</th>
                          <th className="px-3 py-3 font-medium">Assignment</th>
                          <th className="px-3 py-3 font-medium">Subject</th>
                          <th className="px-3 py-3 font-medium">Score</th>
                          <th className="px-3 py-3 font-medium">Grade</th>
                          <th className="px-3 py-3 font-medium">Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => (
                          <tr key={result.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-3 py-3 text-slate-900">{result.studentName}</td>
                            <td className="px-3 py-3 text-slate-900">{result.assignmentTitle}</td>
                            <td className="px-3 py-3 text-slate-600">{result.subjectName}</td>
                            <td className="px-3 py-3 text-slate-900">
                              {result.score == null ? "-" : result.score}
                            </td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                {result.grade || "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {result.publishedAt
                                ? format(new Date(result.publishedAt), "MMM d, yyyy")
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <Announcements />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
