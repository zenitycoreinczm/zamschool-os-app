"use client";

import { useRef, useState } from "react";
import { adminApiJson } from "@/lib/admin-browser-api";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Papa from "papaparse";
import { toast } from "sonner";

interface BulkImportProps {
  role: "STUDENT" | "TEACHER" | "PARENT";
  onComplete?: () => void;
}

type ImportRow = Record<string, any>;
type ImportedCredential = {
  email: string;
  temporaryPassword: string;
};

export default function BulkImport({ role, onComplete }: BulkImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [credentials, setCredentials] = useState<ImportedCredential[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplate = () => {
    const templates = {
      STUDENT:
        "name,email,admission_number,gender,date_of_birth,phone,status\nJohn Doe,john@example.com,STU001,MALE,2010-05-15,+260970000000,ACTIVE",
      TEACHER:
        "name,email,employee_id,gender,phone,status\nJane Smith,jane@example.com,EMP001,FEMALE,+260970000001,ACTIVE",
      PARENT: "name,email,phone\nRobert Zulu,robert@example.com,+260970000002",
    };
    return templates[role];
  };

  const downloadTemplate = () => {
    const blob = new Blob([getTemplate()], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${role.toLowerCase()}_import_template.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setCredentials([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData((results.data as ImportRow[]) || []);
      },
      error: (error) => {
        toast.error("Failed to parse CSV file");
        console.error(error);
      },
    });
  };

  const validateData = (data: ImportRow[]) => {
    const nextErrors: Array<{ row: number; message: string }> = [];

    const validatedData = data.map((row, index) => {
      if (!normalizeOptionalString(row.name)) {
        nextErrors.push({ row: index + 1, message: "Name is required" });
      }

      if (!normalizeEmail(row.email)) {
        nextErrors.push({ row: index + 1, message: "Email is required" });
      }

      if (role === "STUDENT" && !normalizeOptionalString(row.admission_number)) {
        nextErrors.push({ row: index + 1, message: "Admission number is required" });
      }

      if (role === "TEACHER" && !normalizeOptionalString(row.employee_id)) {
        nextErrors.push({ row: index + 1, message: "Employee ID is required" });
      }

      return row;
    });

    setErrors(nextErrors);
    setParsedData(validatedData);
    setShowPreview(true);
  };

  const processImport = async () => {
    if (errors.length > 0) {
      toast.error("Please fix errors before importing");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading(`Importing ${parsedData.length} ${role.toLowerCase()}s...`);

    try {
      const issuedCredentials: ImportedCredential[] = [];

      for (let index = 0; index < parsedData.length; index += 1) {
        const row = parsedData[index];
        const payload = buildManagedAccountPayload(role, row);

        const body = await adminApiJson<{ email?: string; temporaryPassword?: string }>("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (body?.temporaryPassword) {
          issuedCredentials.push({
            email: String(body.email || payload.email),
            temporaryPassword: String(body.temporaryPassword),
          });
        }
      }

      setCredentials(issuedCredentials);
      setShowPreview(false);
      setParsedData([]);
      setSelectedFileName("");
      toast.success(`Successfully imported ${parsedData.length} records`, { id: loadingToast });
      onComplete?.();
    } catch (error: any) {
      toast.error(error?.message || "Import failed", { id: loadingToast });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  const downloadCredentials = () => {
    if (credentials.length === 0) return;

    const header = "email,temporary_password";
    const rows = credentials.map((entry) =>
      [escapeCsv(entry.email), escapeCsv(entry.temporaryPassword)].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${role.toLowerCase()}_import_credentials.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const copyCredentials = async () => {
    if (credentials.length === 0) return;

    const text = credentials
      .map(
        (entry) =>
          `Email: ${entry.email}\nTemporary Password (one-time): ${entry.temporaryPassword}\nThe user must change this password on first mobile login.`
      )
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Credentials copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="w-full space-y-4">
      {!showPreview ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 transition-colors hover:bg-slate-50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lamaSky/10">
            <Upload className="h-8 w-8 text-lamaSky" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-800">Bulk Import {role}s</h3>
          <p className="mb-6 max-w-xs text-center text-sm text-slate-500">
            Upload a CSV file with your {role.toLowerCase()} records. Managed accounts are provisioned
            with sign-in credentials during import.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>

            <button
              type="button"
              onClick={triggerFileDialog}
              aria-controls="bulk-import-file-input"
              className="flex items-center gap-2 rounded-xl bg-lamaSky px-6 py-2 text-sm font-bold text-white shadow-lg shadow-lamaSky/20 transition-all hover:bg-opacity-90"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Select CSV File
            </button>
            <input
              id="bulk-import-file-input"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
          </div>

          {selectedFileName ? (
            <p className="mt-3 text-xs text-slate-500" aria-live="polite">
              Selected file: <span className="font-medium text-slate-700">{selectedFileName}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-bold text-slate-800">Import Preview ({parsedData.length} rows)</h3>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="rounded-full p-1 transition-colors hover:bg-slate-200"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="max-h-[400px] overflow-auto">
            {errors.length > 0 ? (
              <div className="border-b border-red-100 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-bold">Validation Errors Found ({errors.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-red-500">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                  {errors.length > 5 ? <li>...and {errors.length - 5} more errors</li> : null}
                </ul>
              </div>
            ) : null}

            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-bold">#</th>
                  <th className="px-4 py-2 text-left font-bold">Name</th>
                  <th className="px-4 py-2 text-left font-bold">Email</th>
                  {role === "STUDENT" ? (
                    <th className="px-4 py-2 text-left font-bold">Adm. No</th>
                  ) : null}
                  {role === "TEACHER" ? (
                    <th className="px-4 py-2 text-left font-bold">Emp. ID</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, index) => (
                  <tr key={`${normalizeOptionalString(row.email) || "row"}-${index}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-700">{row.name}</td>
                    <td className="px-4 py-2 text-slate-500">{row.email}</td>
                    {role === "STUDENT" ? (
                      <td className="px-4 py-2 text-slate-500">{row.admission_number}</td>
                    ) : null}
                    {role === "TEACHER" ? (
                      <td className="px-4 py-2 text-slate-500">{row.employee_id}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <button
              onClick={() => setShowPreview(false)}
              className="rounded-xl px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={processImport}
              disabled={isUploading || errors.length > 0}
              className="flex items-center gap-2 rounded-xl bg-lamaSky px-6 py-2 font-bold text-white shadow-lg shadow-lamaSky/20 transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Import
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {credentials.length > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="font-semibold text-emerald-950">Imported credentials</h4>
              <p className="mt-1 text-sm text-emerald-800">
                Save these one-time temporary passwords and share them securely. Each user must
                change the password on first mobile login.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void copyCredentials()}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
              >
                Copy credentials
              </button>
              <button
                onClick={downloadCredentials}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-emerald-100 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-emerald-50 text-emerald-900">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Temporary password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((entry) => (
                  <tr key={entry.email} className="border-t border-emerald-50">
                    <td className="px-4 py-2 text-slate-700">{entry.email}</td>
                    <td className="px-4 py-2 font-mono text-slate-900">{entry.temporaryPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildManagedAccountPayload(role: BulkImportProps["role"], row: ImportRow) {
  const { firstName, lastName } = splitName(row.name);
  const email = normalizeEmail(row.email);

  if (!email) {
    throw new Error("Imported row is missing a valid email address.");
  }

  return {
    role: role.toLowerCase(),
    firstName,
    lastName,
    email,
    phone: normalizeOptionalString(row.phone),
    profileExtras:
      role === "STUDENT"
        ? {
            admission_number: normalizeOptionalString(row.admission_number),
            gender: normalizeOptionalString(row.gender),
            status: normalizeOptionalString(row.status),
          }
        : role === "TEACHER"
          ? {
              employee_id: normalizeOptionalString(row.employee_id),
              gender: normalizeOptionalString(row.gender),
              status: normalizeOptionalString(row.status),
            }
          : {
              gender: normalizeOptionalString(row.gender),
              status: normalizeOptionalString(row.status),
            },
    parentExtras:
      role === "PARENT"
        ? {
            relation_type: normalizeOptionalString(row.relation_type),
            occupation: normalizeOptionalString(row.occupation),
          }
        : undefined,
  };
}

function splitName(value: unknown) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "Unknown",
    lastName: parts.length > 1 ? parts.slice(-1).join(" ") : "",
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value: unknown) {
  const trimmed = normalizeOptionalString(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

function escapeCsv(value: string) {
  const text = String(value || "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
