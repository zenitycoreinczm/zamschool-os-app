"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";

type PaymentRow = {
  id: string;
  student_id: string | null;
  amount: number;
  reference_number: string | null;
  status: string;
  payment_type: string | null;
  student?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    admission_number?: string | null;
  } | null;
};

export default function AdminFeesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadRows();
      } catch (err: any) {
        toast.error(err?.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const loadRows = async () => {
    const response = await adminApiJson<{ data?: PaymentRow[] }>("/api/admin/payments");
    setRows(
      (Array.isArray(response.data) ? response.data : []).map((row) => ({
        ...row,
        status: normalizeStatus(row.status),
        student: (row as any).profiles || (row as any).student || null,
      }))
    );
  };

  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      const st = normalizeStatus(r.status);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const student = getStudentLabel(r).toLowerCase();
      const ref = String(r.reference_number || "").toLowerCase();
      return student.includes(q) || ref.includes(q);
    });
  }, [rows, query, statusFilter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => normalizeStatus(r.status) === "pending").length,
    [rows]
  );
  const confirmedRows = useMemo(
    () => rows.filter((r) => normalizeStatus(r.status) === "confirmed"),
    [rows]
  );
  const confirmedValue = useMemo(
    () => confirmedRows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [confirmedRows]
  );

  const updateStatus = async (id: string, next: "confirmed" | "rejected") => {
    const t = toast.loading(next === "confirmed" ? "Confirming payment..." : "Rejecting payment...");
    try {
      await adminApiJson(`/api/admin/payments?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ id, status: next.toUpperCase() }),
      });
      await loadRows();
      toast.success(`Payment ${next}`, { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status", { id: t });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading payments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments Review</h1>
        <p className="text-slate-500 mt-1">Approve or reject submitted school fee payments.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card label="Pending" value={String(pendingCount)} />
        <Card label="Confirmed" value={String(confirmedRows.length)} />
        <Card label="Total Confirmed" value={`ZMW ${confirmedValue.toLocaleString()}`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student or reference"
            className="w-full text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "pending", "confirmed", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${
                statusFilter === s ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Student</th>
              <th className="text-left px-3 py-2">Reference</th>
              <th className="text-left px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-slate-500">No payments found.</td></tr>
            ) : (
              visibleRows.map((r) => {
                const st = normalizeStatus(r.status);
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-3 font-medium text-slate-800">{getStudentLabel(r)}</td>
                    <td className="px-3 py-3 text-slate-600">{String(r.reference_number || "-")}</td>
                    <td className="px-3 py-3 text-slate-600">{Number(r.amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        st === "confirmed" ? "bg-emerald-100 text-emerald-700" : st === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {st}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={st === "confirmed"}
                          onClick={() => updateStatus(r.id, "confirmed")}
                          className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center disabled:opacity-50"
                          aria-label={`Confirm payment ${r.reference_number || r.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          disabled={st === "rejected"}
                          onClick={() => updateStatus(r.id, "rejected")}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center disabled:opacity-50"
                          aria-label={`Reject payment ${r.reference_number || r.id}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function getStudentLabel(row: PaymentRow) {
  const student = row.student;
  if (!student) return "-";
  return (
    [student.first_name, student.last_name].filter(Boolean).join(" ").trim() ||
    student.admission_number ||
    student.email ||
    "-"
  );
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "pending").trim().toLowerCase();
}
