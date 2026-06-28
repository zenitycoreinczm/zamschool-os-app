// Staff invitations view — shared by admin and principal pages.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MailPlus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";
import {
  STAFF_INVITE_ROLE_OPTIONS,
  type StaffInviteRoleOption,
} from "@/lib/staff-invite-options";
import { Surface } from "@/components/workspace/Surface";

type Invitation = {
  id: string;
  email: string;
  role: string;
  department?: string | null;
  position?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at?: string;
  expires_at?: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  accept_url?: string;
  temporary_password?: string;
};

type Department = {
  id: string;
  name: string;
};

type FormState = {
  email: string;
  role: string;
  department: string;
  position: string;
  first_name: string;
  last_name: string;
  phone: string;
};

const EMPTY_FORM: FormState = {
  email: "",
  role: "",
  department: "",
  position: "",
  first_name: "",
  last_name: "",
  phone: "",
};

export function StaffInvitationsView({
  roleOptions = STAFF_INVITE_ROLE_OPTIONS,
  title = "Staff invitations",
  description = "Invite leadership and staff without sharing passwords manually. New users complete first-login setup before gaining full access.",
}: {
  roleOptions?: StaffInviteRoleOption[];
  title?: string;
  description?: string;
}) {
  const defaultRole = roleOptions[0]?.value || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<
    "pending" | "accepted" | "revoked" | "all"
  >("pending");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, role: defaultRole });
  const [lastCreatedPassword, setLastCreatedPassword] = useState<string | null>(
    null,
  );

  const canInvite = useMemo(() => {
    return (
      form.email.trim().includes("@") &&
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length > 0 &&
      form.role.trim().length > 0
    );
  }, [form]);

  const loadInvitations = useCallback(async () => {
    const query = filter === "all" ? "" : `?status=${filter}`;
    const body = await adminApiJson<{ data?: Invitation[] }>(
      `/api/staff/invitations${query}`,
    );
    setInvitations(body.data || []);
  }, [filter]);

  const loadDepartments = useCallback(async () => {
    try {
      const body = await adminApiJson<{ data?: Department[] }>(
        "/api/school/departments",
      );
      setDepartments(body.data || []);
    } catch {
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([loadInvitations(), loadDepartments()]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load invitations";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadInvitations, loadDepartments]);

  const sendInvitation = async () => {
    if (!canInvite) {
      toast.error("Email, role, first name, and last name are required");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Creating staff account...");
    try {
      const body = await adminApiJson<{
        data?: { temporary_password?: string };
      }>("/api/staff/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
          department: form.department.trim() || undefined,
          position: form.position.trim() || undefined,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });

      const tempPassword = body.data?.temporary_password || null;
      setLastCreatedPassword(tempPassword);
      setForm({ ...EMPTY_FORM, role: defaultRole });
      await loadInvitations();
      if (tempPassword) {
        toast.success(
          `Account created. Temporary password: ${tempPassword}`,
          { id: toastId, duration: 10000 },
        );
      } else {
        toast.success("Account created", { id: toastId });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create invitation";
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    if (!window.confirm(`Revoke invitation for ${invitation.email}?`)) return;

    const toastId = toast.loading("Revoking invitation...");
    try {
      await adminApiJson(
        `/api/staff/invitations?id=${encodeURIComponent(invitation.id)}`,
        {
          method: "DELETE",
        },
      );
      await loadInvitations();
      toast.success("Invitation revoked", { id: toastId });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to revoke invitation";
      toast.error(message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading invitations...
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <Surface variant="default" className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </Surface>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Surface variant="default" className="p-5" as="div">
          <h2 className="text-sm font-semibold text-slate-900">
            Invite staff member
          </h2>
          <div className="mt-4 space-y-3">
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Role</span>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Department</span>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((p) => ({ ...p, department: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
              >
                <option value="">Not assigned</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Position"
              value={form.position}
              onChange={(v) => setForm((p) => ({ ...p, position: v }))}
            />
            <Field
              label="First name"
              value={form.first_name}
              onChange={(v) => setForm((p) => ({ ...p, first_name: v }))}
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChange={(v) => setForm((p) => ({ ...p, last_name: v }))}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
          </div>
          <button
            type="button"
            onClick={() => void sendInvitation()}
            disabled={!canInvite || saving}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MailPlus className="h-4 w-4" />
            )}
            Send invitation
          </button>
        </Surface>

        <Surface variant="default" className="p-5" as="div">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Invitation queue
            </h2>
            <div className="flex flex-wrap gap-2">
              {(["pending", "accepted", "revoked", "all"] as const).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      filter === value
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Staff</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No invitations in this view.
                    </td>
                  </tr>
                ) : (
                  invitations.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">
                          {[row.first_name, row.last_name]
                            .filter(Boolean)
                            .join(" ") || row.email}
                        </p>
                        <p className="text-slate-500">{row.email}</p>
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600">
                        {row.role?.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {row.department || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {invitationStatus(row)}
                      </td>
                      <td className="px-3 py-3">
                        {!row.accepted_at && !row.revoked_at ? (
                          <button
                            type="button"
                            onClick={() => void revokeInvitation(row)}
                            className="rounded-lg border border-slate-200 p-2 text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                            aria-label={`Revoke ${row.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
      />
    </label>
  );
}

function invitationStatus(row: Invitation) {
  if (row.revoked_at) return "Revoked";
  if (row.accepted_at) return "Accepted";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "Expired";
  return "Pending";
}
