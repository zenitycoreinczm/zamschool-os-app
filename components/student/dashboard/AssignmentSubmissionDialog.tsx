"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, Upload, X } from "lucide-react";

import {
  buildUploadFormData,
  uploadFile,
} from "@/lib/file-upload-client";
import { formatDateLabel } from "@/components/student/dashboard/format";
import type {
  StudentAssignmentRow,
  SubmissionFormState,
} from "@/components/student/dashboard/types";

const EMPTY_FORM: SubmissionFormState = {
  submissionText: "",
  submissionLink: "",
  submissionFile: null,
};

export function AssignmentSubmissionDialog({
  assignment,
  onClose,
  onSaved,
}: {
  assignment: StudentAssignmentRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<SubmissionFormState>(EMPTY_FORM);
  const [submittingFile, setSubmittingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assignment) {
      setForm(EMPTY_FORM);
      setError("");
      setSubmittingFile(false);
      setSaving(false);
      return;
    }
    setForm({
      submissionText: assignment.submissionText || "",
      submissionLink: assignment.submissionLink || "",
      submissionFile: null,
    });
    setError("");
    setSubmittingFile(false);
    setSaving(false);
  }, [assignment]);

  useEffect(() => {
    if (!assignment) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [assignment, onClose]);

  if (!assignment) {
    return null;
  }

  const updateField = <K extends keyof SubmissionFormState>(
    key: K,
    value: SubmissionFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function handleSave() {
    if (!assignment) return;

    const submissionText = form.submissionText.trim();
    const submissionLink = form.submissionLink.trim();
    const submissionFile = form.submissionFile;

    if (!submissionText && !submissionLink && !submissionFile) {
      setError("Add submission text, a link, or a file before saving.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let submissionFileUrl = "";
      let submissionFileName = "";

      if (submissionFile) {
        setSubmittingFile(true);
        const uploadResult = await uploadFile(
          buildUploadFormData(submissionFile, "submission"),
        );
        submissionFileUrl = uploadResult.url || uploadResult.key;
        submissionFileName = submissionFile.name;
        setSubmittingFile(false);
      }

      const response = await fetch("/api/student/assignments/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
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

      await onSaved();
      onClose();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save assignment submission",
      );
    } finally {
      setSaving(false);
      setSubmittingFile(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-submission-dialog-heading"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Assignment submission
            </p>
            <h2
              id="assignment-submission-dialog-heading"
              className="mt-2 text-2xl font-semibold text-slate-900"
            >
              {assignment.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {assignment.subjectName} | Due {formatDateLabel(assignment.dueDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close submission dialog"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Submission notes
            </span>
            <textarea
              value={form.submissionText}
              onChange={(event) => updateField("submissionText", event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Describe your work, attach a summary, or paste the answer text here."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Submission link
            </span>
            <input
              type="url"
              value={form.submissionLink}
              onChange={(event) => updateField("submissionLink", event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="https://drive.google.com/... or another share link"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Upload file (optional)
            </span>
            <div className="flex items-center gap-3">
              <input
                type="file"
                onChange={(event) =>
                  updateField("submissionFile", event.target.files?.[0] || null)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
              />
              {form.submissionFile ? (
                <span className="shrink-0 text-xs text-slate-500">
                  <Paperclip className="mr-1 inline h-3 w-3" />
                  {form.submissionFile.name}
                </span>
              ) : null}
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submittingFile ? (
              <Upload className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submittingFile
              ? "Uploading file..."
              : assignment.submissionStatus === "submitted"
                ? "Update submission"
                : "Submit work"}
          </button>
        </div>
      </section>
    </div>
  );
}
