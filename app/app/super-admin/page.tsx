"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Shield,
  Users,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AccessCode = {
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  max_uses?: number;
  use_count?: number;
};

type Stats = { total: number; active: number; used: number; expired: number };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeRemainingParts(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  return { hours, mins, secs, total: diff };
}

function formatCountdown(
  parts: { hours: number; mins: number; secs: number } | null,
) {
  if (!parts) return "Expired";
  if (parts.hours > 0) return `${parts.hours}h ${parts.mins}m ${parts.secs}s`;
  if (parts.mins > 0) return `${parts.mins}m ${parts.secs}s`;
  return `${parts.secs}s`;
}

/* ------------------------------------------------------------------ */
/*  Live Countdown Hook                                                */
/* ------------------------------------------------------------------ */

function useCountdown(expiresAt: string) {
  const [parts, setParts] = useState(() => timeRemainingParts(expiresAt));

  useEffect(() => {
    const tick = () => setParts(timeRemainingParts(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return parts;
}

/* ------------------------------------------------------------------ */
/*  CodeBadge                                                          */
/* ------------------------------------------------------------------ */

function CodeBadge({
  code,
  onDelete,
  deleting,
}: {
  code: AccessCode;
  onDelete: (code: string) => void;
  deleting: boolean;
}) {
  const isUsed = Boolean(code.used_at);
  const isExpired = !isUsed && new Date(code.expires_at) < new Date();
  const isActive = !isUsed && !isExpired;
  const countdown = useCountdown(code.expires_at);

  const copy = () => {
    navigator.clipboard.writeText(code.code);
    toast.success("Code copied to clipboard");
  };

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all ${
        isUsed
          ? "border-slate-200 bg-slate-50 opacity-60"
          : isExpired
            ? "border-amber-200 bg-amber-50/50"
            : "border-sky-200 bg-sky-50/60 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUsed
                ? "bg-slate-200"
                : isExpired
                  ? "bg-amber-100"
                  : "bg-sky-100"
            }`}
          >
            {isUsed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : isExpired ? (
              <XCircle className="w-5 h-5 text-amber-500" />
            ) : (
              <KeyRound className="w-5 h-5 text-sky-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-800">
                {isActive ? code.code : "••••••"}
              </span>
              {isActive && (
                <button
                  onClick={copy}
                  title="Copy code"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-100 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isUsed
                    ? "bg-slate-200 text-slate-600"
                    : isExpired
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                }`}
              >
                {isUsed ? "Used" : isExpired ? "Expired" : "Active"}
              </span>
              {isActive && countdown && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatCountdown(countdown)}
                </span>
              )}
              {isUsed && code.used_by_email && (
                <span className="text-xs text-slate-500 truncate max-w-[180px]">
                  Used by {code.used_by_email}
                </span>
              )}
              {code.max_uses && code.max_uses > 1 && (
                <span className="text-xs text-slate-400">
                  ({code.use_count ?? 0}/{code.max_uses} uses)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete button — only for unused codes */}
        {isActive && (
          <button
            onClick={() => onDelete(code.code)}
            disabled={deleting}
            title="Delete unused code"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {isActive && (
        <p className="mt-2 text-xs text-slate-500">
          Created {new Date(code.created_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Code Form                                                 */
/* ------------------------------------------------------------------ */

function GenerateForm({
  onGenerate,
  loading,
}: {
  onGenerate: (opts: { expiresInHours: number; maxUses: number }) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hours, setHours] = useState(3);
  const [maxUses, setMaxUses] = useState(1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Primary row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => onGenerate({ expiresInHours: hours, maxUses })}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-sky-500/25 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Generate Code
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {expanded ? "Less options" : "More options"}
        </button>
        {!expanded && (
          <span className="text-xs text-slate-400">
            {hours}h expiry, {maxUses} use{maxUses > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Expires in (hours)
            </label>
            <input
              type="number"
              min={1}
              max={720}
              value={hours}
              onChange={(e) =>
                setHours(
                  Math.max(1, Math.min(720, Number(e.target.value) || 1)),
                )
              }
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Max uses
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) =>
                setMaxUses(
                  Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                )
              }
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function SuperAdminPage() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
  });
  const mountedRef = useRef(true);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await adminApiJson("/api/super-admin/access-codes");
      const list: AccessCode[] = json.data || [];
      if (!mountedRef.current) return;
      setCodes(list);

      const now = new Date();
      const active = list.filter(
        (c) => !c.used_at && new Date(c.expires_at) > now,
      ).length;
      const used = list.filter((c) => Boolean(c.used_at)).length;
      const expired = list.filter(
        (c) => !c.used_at && new Date(c.expires_at) <= now,
      ).length;
      setStats({ total: list.length, active, used, expired });
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load codes";
      setError(msg);
      toast.error(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadCodes();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCodes]);

  const createCode = async (opts: {
    expiresInHours: number;
    maxUses: number;
  }) => {
    setCreating(true);
    try {
      const json = await adminApiJson("/api/super-admin/access-codes", {
        method: "POST",
        body: JSON.stringify({
          expiresInHours: opts.expiresInHours,
          maxUses: opts.maxUses,
        }),
      });
      toast.success(`New access code generated: ${(json as any)?.data?.code}`);
      void loadCodes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const deleteCode = async (code: string) => {
    if (!confirm(`Delete unused code ${code}? This cannot be undone.`)) return;
    setDeletingCode(code);
    try {
      await adminApiJson(`/api/super-admin/access-codes?code=${code}`, {
        method: "DELETE",
      });
      toast.success("Code deleted");
      void loadCodes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete code");
    } finally {
      setDeletingCode(null);
    }
  };

  const activeCodes = codes.filter(
    (c) => !c.used_at && new Date(c.expires_at) > new Date(),
  );
  const historyCodes = codes.filter(
    (c) => Boolean(c.used_at) || new Date(c.expires_at) <= new Date(),
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-600" />
            Super Admin Console
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage school registration access codes. Each code allows one school
            to register on ZamSchool OS.
          </p>
        </div>
        <button
          onClick={loadCodes}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total codes",
            value: stats.total,
            icon: KeyRound,
            color: "text-slate-600 bg-slate-100",
          },
          {
            label: "Active",
            value: stats.active,
            icon: CheckCircle2,
            color: "text-sky-600 bg-sky-100",
          },
          {
            label: "Used (schools)",
            value: stats.used,
            icon: Building2,
            color: "text-emerald-600 bg-emerald-100",
          },
          {
            label: "Expired",
            value: stats.expired,
            icon: XCircle,
            color: "text-amber-600 bg-amber-100",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}
            >
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
          <Users className="w-4 h-4" /> How access codes work
        </p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>
            Each code is a random 6-digit number, valid for{" "}
            <strong>3 hours</strong> by default (customizable).
          </li>
          <li>
            A code can only be used <strong>once</strong> — to register exactly
            one school.
          </li>
          <li>
            Share the code securely with the school administrator before they
            attempt to register.
          </li>
          <li>Unused, unexpired codes can be deleted at any time.</li>
        </ul>
      </div>

      {/* Generate Code */}
      <GenerateForm onGenerate={createCode} loading={creating} />

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Failed to load access codes
            </p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadCodes}
            className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Codes */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Active Codes ({activeCodes.length})
        </h2>
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading codes...</span>
          </div>
        ) : activeCodes.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No active codes. Click <strong>Generate Code</strong> to create
              one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCodes.map((code) => (
              <div key={code.code} className="relative group">
                <CodeBadge
                  code={code}
                  onDelete={deleteCode}
                  deleting={deletingCode === code.code}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {historyCodes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            History ({historyCodes.length})
          </h2>
          <div className="space-y-2">
            {historyCodes.map((code) => (
              <CodeBadge
                key={code.code}
                code={code}
                onDelete={deleteCode}
                deleting={deletingCode === code.code}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
