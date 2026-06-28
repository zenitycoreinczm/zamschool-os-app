"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Surface } from "@/components/workspace/Surface";
import { buildUploadFormData, uploadFile } from "@/lib/file-upload-client";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Paperclip,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Assignment = {
  id: string;
  title: string;
  dueDate: string;
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

type AssignmentsResponse = {
  success?: boolean;
  data?: { rows: Assignment[]; total: number; limit: number; offset: number };
  error?: string;
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    submissionText: "",
    submissionLink: "",
    submissionFile: null as File | null,
  });
  const [submittingFile, setSubmittingFile] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/assignments?limit=200", {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load assignments");
      }

      const body: AssignmentsResponse = await res.json();
      setAssignments(body.data?.rows || []);
      setTotal(body.data?.total || 0);
    } catch (loadError: unknown) {
      setAssignments([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load assignments",
      );
    } finally {
      setLoading(false);
    }
  }

  function openSubmissionDialog(assignment: Assignment) {
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

    const text = submissionForm.submissionText.trim();
    const link = submissionForm.submissionLink.trim();
    const file = submissionForm.submissionFile;

    if (!text && !link && !file) {
      setSubmissionError(
        "Add submission text, a link, or a file before saving.",
      );
      return;
    }

    setSavingSubmission(true);
    setSubmissionError("");

    try {
      let fileUrl = "";
      let fileName = "";

      if (file) {
        setSubmittingFile(true);
        const uploadResult = await uploadFile(
          buildUploadFormData(file, "submission"),
        );
        fileUrl = uploadResult.url || uploadResult.key;
        fileName = file.name;
        setSubmittingFile(false);
      }

      const response = await fetch("/api/student/assignments/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          submissionText: text || undefined,
          submissionLink: link || undefined,
          submissionFileUrl: fileUrl || undefined,
          submissionFileName: fileName || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save submission");
      }

      await loadAssignments();
      closeSubmissionDialog();
    } catch (saveError: unknown) {
      setSubmissionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save submission",
      );
    } finally {
      setSavingSubmission(false);
      setSubmittingFile(false);
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Surface variant="elevated" className="max-w-md p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-3 text-sm text-rose-600">{error}</p>
        </Surface>
      </div>
    );
  }

  const urgentCount = assignments.filter((a) => a.urgent).length;
  const submittedCount = assignments.filter(
    (a) => a.submissionStatus === "submitted",
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500">{total} total</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAssignments()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Surface variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </Surface>
        <Surface variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{urgentCount}</p>
              <p className="text-xs text-slate-500">Urgent</p>
            </div>
          </div>
        </Surface>
        <Surface variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {submittedCount}
              </p>
              <p className="text-xs text-slate-500">Submitted</p>
            </div>
          </div>
        </Surface>
      </div>

      {assignments.length === 0 ? (
        <Surface variant="elevated" className="p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No assignments yet.</p>
        </Surface>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Surface key={a.id} variant="elevated" className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {a.title}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        a.submissionStatus === "submitted"
                          ? "bg-emerald-50 text-emerald-700"
                          : a.urgent
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {a.submissionStatus === "submitted"
                        ? "Submitted"
                        : a.urgent
                          ? "Urgent"
                          : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.subjectName} &middot; {a.teacherName}
                  </p>
                  {a.description && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                      {a.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Due: {formatDateLabel(a.dueDate)}{" "}
                    {a.totalMarks ? `\u00B7 ${a.totalMarks} marks` : ""}
                  </p>
                  {a.submissionLink && (
                    <a
                      href={a.submissionLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-sky-700 hover:text-sky-800"
                    >
                      View submitted link
                    </a>
                  )}
                  {a.submissionFileUrl && (
                    <a
                      href={a.submissionFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800"
                    >
                      <Paperclip className="h-3 w-3" />
                      {a.submissionFileName || "View submitted file"}
                    </a>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[280px]">
                  <MiniStat
                    label="Due date"
                    value={formatDateLabel(a.dueDate)}
                  />
                  <MiniStat
                    label="Total marks"
                    value={String(a.totalMarks ?? 0)}
                  />
                  <MiniStat
                    label="Submitted"
                    value={
                      a.submittedAt
                        ? formatDateTimeLabel(a.submittedAt)
                        : "Not yet"
                    }
                  />
                  <MiniStat
                    label="Last updated"
                    value={
                      a.updatedAt ? formatDateTimeLabel(a.updatedAt) : "Not yet"
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => openSubmissionDialog(a)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  <Send className="h-4 w-4" />
                  {a.submissionStatus === "submitted"
                    ? "Update submission"
                    : "Submit work"}
                </button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {selectedAssignment && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-assignment-submit-heading"
        >
          <Surface variant="elevated" className="w-full max-w-2xl p-6" as="div">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Assignment submission
                </p>
                <h2
                  id="student-assignment-submit-heading"
                  className="mt-2 text-2xl font-semibold text-slate-900"
                >
                  {selectedAssignment.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedAssignment.subjectName} &middot; Due{" "}
                  {formatDateLabel(selectedAssignment.dueDate)}
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

            {submissionError && (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {submissionError}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Submission notes
                </span>
                <textarea
                  value={submissionForm.submissionText}
                  onChange={(e) =>
                    setSubmissionForm((c) => ({
                      ...c,
                      submissionText: e.target.value,
                    }))
                  }
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Describe your work, paste the answer text here."
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Submission link
                </span>
                <input
                  type="url"
                  value={submissionForm.submissionLink}
                  onChange={(e) =>
                    setSubmissionForm((c) => ({
                      ...c,
                      submissionLink: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="https://drive.google.com/... or another share link"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Upload file (optional)
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSubmissionForm((c) => ({
                        ...c,
                        submissionFile: file,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {submissionForm.submissionFile && (
                    <span className="shrink-0 text-xs text-slate-500">
                      <Paperclip className="mr-1 inline h-3 w-3" />
                      {submissionForm.submissionFile.name}
                    </span>
                  )}
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
                {savingSubmission ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : submittingFile ? (
                  <Upload className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submittingFile
                  ? "Uploading file..."
                  : selectedAssignment.submissionStatus === "submitted"
                    ? "Update submission"
                    : "Submit work"}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
