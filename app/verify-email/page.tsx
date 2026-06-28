"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  AlertCircle,
  Mail,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { cn } from "@/lib/utils";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell>
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          </div>
        </AuthPageShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const loadSession = async () => {
      const emailParam = searchParams.get("email");
      const userIdParam = searchParams.get("userId");

      if (emailParam && userIdParam) {
        setEmail(emailParam);
        setUserId(userIdParam);
        await sendOtp(emailParam, userIdParam);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email && user?.id) {
          setEmail(user.email);
          setUserId(user.id);
          await sendOtp(user.email, user.id);
        } else {
          router.replace("/login");
        }
      }

      // Focus the first OTP input after email loads
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    };

    loadSession();
  }, [router, searchParams]);

  const sendOtp = async (targetEmail: string, targetUserId: string) => {
    setResendLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email: targetEmail, userId: targetUserId }),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to send verification code");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setResendLoading(false);
    }
  };

  const handleResend = () => {
    if (email && userId) {
      sendOtp(email, userId);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join("");
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullOtp: string) => {
    if (!email || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, userId, otpCode: fullOtp }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Verification failed");

      setSuccess(true);

      setTimeout(() => {
        const destination =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : "/login?verified=true";
        router.replace(destination);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const cardClass =
    "w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]";

  if (success) {
    return (
      <AuthPageShell>
        <div className={cardClass}>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-slate-950">
            Email verified
          </h1>
          <p className="text-slate-500">
            Your email has been verified. Continuing...
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className={cardClass}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Mail className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-950">
          Verify your email
        </h1>
        <p className="mb-6 text-slate-500">
          {"We've sent a 6-digit code to"}
          <br />
          <span className="font-semibold text-emerald-600">
            {email || "your email"}
          </span>
        </p>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className={cn(
                "h-14 w-12 rounded-xl border-2 bg-slate-50 text-center text-2xl font-bold text-slate-950",
                "transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-300",
                "disabled:opacity-50",
                digit ? "border-emerald-500" : "border-slate-200",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleVerify(otp.join(""))}
          disabled={loading || otp.join("").length !== 6}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-lg font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify code"
          )}
        </button>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600 disabled:opacity-50"
          >
            {resendLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Resend code
              </>
            )}
          </button>

          <a
            href="/login"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    </AuthPageShell>
  );
}
