"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck, ShieldOff, Trash2, QrCode, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { safeErrorMessage } from "@/lib/safe-error";

type Factor = {
  id: string;
  factor_type: "totp" | "phone";
  status: "verified" | "unverified";
  friendly_name?: string;
};

type EnrollData = {
  factorId: string;
  qrCodeUrl: string;
  secret: string;
};

export function MfaSetup() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    void loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/factors");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load MFA factors");
      }
      const json = await res.json();
      setFactors(json.data?.factors ?? []);
    } catch (error: unknown) {
      toast.error(safeErrorMessage(error, "Failed to load MFA factors"));
    } finally {
      setLoading(false);
    }
  }

  async function startEnroll() {
    setEnrolling(true);
    setEnrollData(null);
    setVerifyCode("");
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to start MFA enrollment");
      }
      const json = await res.json();
      setEnrollData(json.data);
    } catch (error: unknown) {
      toast.error(safeErrorMessage(error, "Failed to start MFA enrollment"));
    } finally {
      setEnrolling(false);
    }
  }

  async function confirmEnroll() {
    if (!enrollData || !verifyCode) return;
    setVerifying(true);
    try {
      const challengeRes = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: enrollData.factorId }),
      });
      if (!challengeRes.ok) {
        const body = await challengeRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create challenge");
      }
      const challengeJson = await challengeRes.json();

      const verifyRes = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: enrollData.factorId,
          challengeId: challengeJson.data.challengeId,
          code: verifyCode,
        }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.error || "Invalid verification code");
      }

      toast.success("Two-factor authentication enabled");
      setEnrollData(null);
      setVerifyCode("");
      await loadFactors();
    } catch (error: unknown) {
      toast.error(safeErrorMessage(error, "Verification failed"));
    } finally {
      setVerifying(false);
    }
  }

  async function removeFactor(factorId: string) {
    setRemoving(factorId);
    try {
      const res = await fetch(
        `/api/auth/mfa/factors?factorId=${encodeURIComponent(factorId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to remove MFA factor");
      }
      toast.success("Two-factor authentication removed");
      await loadFactors();
    } catch (error: unknown) {
      toast.error(safeErrorMessage(error, "Failed to remove MFA factor"));
    } finally {
      setRemoving(null);
    }
  }

  function cancelEnroll() {
    setEnrollData(null);
    setVerifyCode("");
  }

  const hasVerifiedFactor = factors.some((f) => f.status === "verified");

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-sky-600" />
        <h2 className="font-semibold text-slate-900">Two-factor authentication</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading MFA status...
        </div>
      ) : (
        <>
          {hasVerifiedFactor ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <span>Your account is protected with two-factor authentication</span>
              </div>
              {factors
                .filter((f) => f.status === "verified")
                .map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700">
                        {factor.friendly_name || "Authenticator app"}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFactor(factor.id)}
                      disabled={removing === factor.id}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {removing === factor.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <ShieldOff className="h-4 w-4" />
                <span>Two-factor authentication is not enabled</span>
              </div>

              {enrollData ? (
                <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-sky-900">
                      Scan QR code with your authenticator app
                    </p>
                    <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                      {enrollData.qrCodeUrl.startsWith("<svg") ? (
                        <div
                          className="h-48 w-48"
                          dangerouslySetInnerHTML={{ __html: enrollData.qrCodeUrl }}
                        />
                      ) : (
                        <Image
                          src={enrollData.qrCodeUrl}
                          alt="QR code"
                          width={192}
                          height={192}
                          unoptimized
                          className="h-48 w-48"
                        />
                      )}
                    </div>
                    <p className="text-xs text-sky-700">
                      Or enter this code manually:{" "}
                      <code className="rounded bg-sky-100 px-1 py-0.5 font-mono text-sky-900">
                        {enrollData.secret}
                      </code>
                    </p>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Enter verification code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full rounded-xl border border-sky-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                    <button
                      onClick={confirmEnroll}
                      disabled={verifying || verifyCode.length < 6}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
                    >
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Verify
                    </button>
                    <button
                      onClick={cancelEnroll}
                      className="rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startEnroll}
                  disabled={enrolling}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Enable two-factor authentication
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
