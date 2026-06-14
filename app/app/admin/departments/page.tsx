"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";

type Department = {
  id: string;
  name: string;
  description?: string | null;
  head_of_department?: string | null;
  is_default?: boolean;
};

type StaffOption = {
  id: string;
  label: string;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  head_of_department: "",
};

export default function AdminDepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSave = useMemo(() => form.name.trim().length >= 2, [form.name]);

  const loadDepartments = useCallback(async () => {
    const body = await adminApiJson<{ data?: Department[] }>("/api/school/departments");
    setDepartments(body.data || []);
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const body = await adminApiJson<{
        data?: { rows?: { id: string; first_name?: string; last_name?: string; email?: string }[] };
      }>("/api/admin/users?tab=teachers&limit=200");
      const rows = body.data?.rows || [];
      setStaffOptions(
        rows.map((row) => ({
          id: row.id,
          label: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || row.id,
        }))
      );
    } catch {
      setStaffOptions([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([loadDepartments(), loadStaff()]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load departments";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadDepartments, loadStaff]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const saveDepartment = async () => {
    if (!canSave) {
      toast.error("Department name must be at least 2 characters");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editingId ? "Updating department..." : "Creating department...");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        head_of_department: form.head_of_department || null,
      };

      if (editingId) {
        await adminApiJson("/api/school/departments", {
          method: "PATCH",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await adminApiJson("/api/school/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadDepartments();
      resetForm();
      toast.success(editingId ? "Department updated" : "Department created", { id: toastId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save department";
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Department) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description || "",
      head_of_department: row.head_of_department || "",
    });
  };

  const deleteDepartment = async (row: Department) => {
    if (row.is_default) {
      toast.error("Default departments cannot be deleted");
      return;
    }
    if (!window.confirm(`Delete department "${row.name}"?`)) return;

    const toastId = toast.loading("Deleting department...");
    try {
      await adminApiJson(`/api/school/departments?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      await loadDepartments();
      if (editingId === row.id) resetForm();
      toast.success("Department deleted", { id: toastId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete department";
      toast.error(message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading departments...
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Departments</h1>
            <p className="mt-1 text-sm text-slate-600">
              Maintain school structure, assign heads of department, and keep staff invitations aligned.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId ? "Edit department" : "Add department"}
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="e.g. Sciences"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Optional summary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Head of department</span>
              <select
                value={form.head_of_department}
                onChange={(e) => setForm((prev) => ({ ...prev, head_of_department: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Not assigned</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveDepartment()}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Save changes" : "Add department"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Head</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No departments yet. Run school initialization or add one manually.
                  </td>
                </tr>
              ) : (
                departments.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.description ? (
                        <p className="mt-1 text-slate-500">{row.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {staffOptions.find((option) => option.id === row.head_of_department)?.label || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.is_default ? "Default" : "Custom"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDepartment(row)}
                          disabled={Boolean(row.is_default)}
                          className="rounded-lg border border-slate-200 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          aria-label={`Delete ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
