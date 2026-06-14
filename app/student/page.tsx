"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Paperclip,
  Send,
  Upload,
  UserSquare2,
  XCircle,
  X,
} from "lucide-react";

import Announcements from "@/components/Announcements";
import { fetchGatewayRead } from "@/lib/gateway-read-client";

type StudentDashboardPayload = {
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    admissionNumber: string | null;
    className: string | null;
    gradeLabel: string | null;
  };
  todayLessons: Array<{
    id: string;
    subjectName: string;
    subjectCode: string | null;
    teacherName: string;
    className: string;
    startTime: string | null;
    endTime: string | null;
  }>;
  attendance: {
    summary: {
      PRESENT: number;
      ABSENT: number;
      LATE: number;
      EXCUSED: number;
      total: number;
      rate: number;
    };
  };
  assignments: {
    total: number;
    urgent: number;
    rows: StudentAssignmentRow[];
  };
};

type StudentDashboardResponse = {
  success?: boolean;
  data?: StudentDashboardPayload;
  error?: string;
};

type StudentResultRow = {
  id: string;
  assignmentTitle: string;
  subjectName: string;
  className: string;
  score: number | null;
  grade: string | null;
  published_at: string | null;
};

type StudentResultsResponse = {
  success?: boolean;
  data?: StudentResultRow[];
  error?: string;
};

type StudentAssignmentRow = {
  id: string;
  title: string;
  dueDate: string | null;
  totalMarks: number | null;
  description: string;
  subjectName: string;
  subjectCode: string | null;
  teacherName: string;
  urgent: boolean;
  submissionId: string | null;
  submissionText: string;
  submissionLink: string | null;
  submissionFileUrl: string | null;
  submissionFileName: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  submissionStatus: "pending" | "submitted";
};

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState<StudentDashboardPayload | null>(null);
  const [results, setResults] = useState<StudentResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignmentRow | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    submissionText: "",
    submissionLink: "",
    submissionFile: null as File | null,
  });
  const [submittingFile, setSubmittingFile] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, resultsResponse] = await Promise.all([
        fetchGatewayRead("/api/student/dashboard", {
          cache: "no-store",
          fallbackToLocal: true,
        }),
        fetchGatewayRead("/api/student/results", {
          cache: "no-store",
          fallbackToLocal: true,
        }),
      ]);

      const dashboardPayload = (await dashboardResponse.json()) as StudentDashboardResponse;
      const resultsPayload = (await resultsResponse.json()) as StudentResultsResponse;

      if (!dashboardResponse.ok) {
        throw new Error(dashboardPayload.error || "Failed to load student dashboard");
      }

      if (!resultsResponse.ok) {
        throw new Error(resultsPayload.error || "Failed to load published results");
      }

      setDashboard(dashboardPayload.data || null);
      setResults(resultsPayload.data || []);
    } catch (loadError: unknown) {
      setDashboard(null);
      setResults([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load student dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  function openSubmissionDialog(assignment: StudentAssignmentRow) {
    setSelectedAssignment(assignment);
    setSubmissionForm({
      submissionText: assignment.submissionText || "",
      submissionLink: assignment.submissionLink || "",
      submissionFile: null,
    });
    setSubmittingFile(false);
    setSubmissionError("");
  }

  function closeSubmissionDialog() {
    setSelectedAssignment(null);
    setSubmissionForm({
      submissionText: "",
      submissionLink: "",
      submissionFile: null,
    });
    setSubmittingFile(false);
    setSubmissionError("");
  }

  async function saveAssignmentSubmission() {
    if (!selectedAssignment) return;

    const submissionText = submissionForm.submissionText.trim();
    const submissionLink = submissionForm.submissionLink.trim();
    const submissionFile = submissionForm.submissionFile;

    if (!submissionText && !submissionLink && !submissionFile) {
      setSubmissionError("Add submission text, a link, or a file before saving.");
      return;
    }

    setSavingSubmission(true);
    setSubmissionError("");

    try {
      let submissionFileUrl = "";
      let submissionFileName = "";

      if (submissionFile) {
        setSubmittingFile(true);
        const uploadForm = new FormData();
        uploadForm.append("file", submissionFile);
        uploadForm.append("entityType", "submission");
        const uploadRes = await fetch("/api/files/upload", { method: "POST", body: uploadForm });
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(uploadErr.error || "Failed to upload file");
        }
        const uploadData = await uploadRes.json();
        submissionFileUrl = uploadData.url || uploadData.key;
        submissionFileName = submissionFile.name;
        setSubmittingFile(false);
      }

      const response = await fetch("/api/student/assignments/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          submissionText: submissionText || undefined,
          submissionLink: submissionLink || undefined,
          submissionFileUrl: submissionFileUrl || undefined,
          submissionFileName: submissionFileName || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save assignment submission");
      }

      await loadDashboard();
      closeSubmissionDialog();
    } catch (saveError: unknown) {
      setSubmissionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save assignment submission"
      );
    } finally {
      setSavingSubmission(false);
      setSubmittingFile(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <section className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mb-3 h-5 w-5 animate-spin" />
          Loading student dashboard...
        </section>
      </div>
    );
  }

  const summary = dashboard?.attendance.summary || {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
    total: 0,
    rate: 0,
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Student Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {dashboard?.profile.fullName || "Student"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {dashboard?.profile.className || "Class pending"}
              {dashboard?.profile.admissionNumber
                ? ` | Admission ${dashboard.profile.admissionNumber}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StudentStatCard label="Present" value={String(summary.PRESENT)} icon={CheckCircle2} tone="emerald" />
        <StudentStatCard label="Absent" value={String(summary.ABSENT)} icon={XCircle} tone="rose" />
        <StudentStatCard label="Late" value={String(summary.LATE)} icon={Clock3} tone="amber" />
        <StudentStatCard label="Attendance Rate" value={`${summary.rate}%`} icon={UserSquare2} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Today&apos;s Lessons
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Class schedule
            </h2>

            <div className="mt-5 space-y-3">
              {(dashboard?.todayLessons || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No lessons are scheduled for today.
                </div>
              ) : (
                dashboard?.todayLessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lesson.teacherName} | {formatTimeRange(lesson.startTime, lesson.endTime)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Upcoming Assignments
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Submit work
            </h2>

            {(dashboard?.assignments.rows || []).length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                No active assignments are available right now.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {dashboard?.assignments.rows.map((assignment) => (
                  <article key={assignment.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{assignment.title}</p>
                          <span className={submissionStatusPill(assignment.submissionStatus)}>
                            {formatSubmissionStatus(assignment.submissionStatus)}
                          </span>
                          {assignment.urgent ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              Due soon
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {assignment.subjectName} | {assignment.teacherName} | Due {formatDateLabel(assignment.dueDate)}
                        </p>
                        {assignment.description ? (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                            {assignment.description}
                          </p>
                        ) : null}
                        {assignment.submissionLink ? (
                          <a
                            href={assignment.submissionLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-sm font-medium text-sky-700 hover:text-sky-800"
                          >
                            View submitted link
                          </a>
                        ) : null}
                        {assignment.submissionFileUrl ? (
                          <a
                            href={assignment.submissionFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {assignment.submissionFileName || "View submitted file"}
                          </a>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                        <MiniStat label="Due date" value={formatDateLabel(assignment.dueDate)} />
                        <MiniStat label="Total marks" value={String(assignment.totalMarks ?? 0)} />
                        <MiniStat label="Submitted" value={assignment.submittedAt ? formatDateTimeLabel(assignment.submittedAt) : "Not yet"} />
                        <MiniStat label="Last updated" value={assignment.updatedAt ? formatDateTimeLabel(assignment.updatedAt) : "Not yet"} />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openSubmissionDialog(assignment)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                      >
                        <Send className="h-4 w-4" />
                        {assignment.submissionStatus === "submitted" ? "Update submission" : "Submit work"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Published Results
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Academic records
            </h2>

            {results.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                No published results are available yet.
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-500">
                    <tr>
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
                          {result.published_at
                            ? format(new Date(result.published_at), "MMM d, yyyy")
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

      {selectedAssignment ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Assignment submission
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedAssignment.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedAssignment.subjectName} | Due {formatDateLabel(selectedAssignment.dueDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSubmissionDialog}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submissionError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submissionError}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">Submission notes</span>
                <textarea
                  value={submissionForm.submissionText}
                  onChange={(event) =>
                    setSubmissionForm((current) => ({
                      ...current,
                      submissionText: event.target.value,
                    }))
                  }
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Describe your work, attach a summary, or paste the answer text here."
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">Submission link</span>
                <input
                  type="url"
                  value={submissionForm.submissionLink}
                  onChange={(event) =>
                    setSubmissionForm((current) => ({
                      ...current,
                      submissionLink: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="https://drive.google.com/... or another share link"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">Upload file (optional)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSubmissionForm((current) => ({
                        ...current,
                        submissionFile: file,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {submissionForm.submissionFile ? (
                    <span className="shrink-0 text-xs text-slate-500">
                      <Paperclip className="mr-1 inline h-3 w-3" />
                      {submissionForm.submissionFile.name}
                    </span>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSubmissionDialog}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveAssignmentSubmission()}
                disabled={savingSubmission}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {savingSubmission ? <Loader2 className="h-4 w-4 animate-spin" /> : submittingFile ? <Upload className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {submittingFile ? "Uploading file..." : selectedAssignment.submissionStatus === "submitted" ? "Update submission" : "Submit work"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StudentStatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "emerald" | "rose" | "amber" | "sky";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-sky-50 text-sky-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "Time not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Time not set";
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy h:mm a");
}

function formatSubmissionStatus(status: "pending" | "submitted") {
  return status === "submitted" ? "Submitted" : "Pending";
}

function submissionStatusPill(status: "pending" | "submitted") {
  return status === "submitted"
    ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
    : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
