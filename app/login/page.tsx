"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import * as z from "zod";
import { getAuthRateLimitState } from "@/lib/auth-rate-limit";
import { resolveOnboardingPath } from "@/lib/auth-routing";
import { buildLoginCooldown, getLoginCooldownState, clearLoginCooldown } from "@/lib/login-cooldown";
import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import { supabase } from "@/lib/supabase";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { cn } from "@/lib/utils";

const MFA_CHALLENGE_PATH = "/login/mfa";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
const FIRST_LOGIN_PATH = "/first-login";
type ProfileSnapshot = {
  role: string | null;
  school_id: string | null;
  must_change_password?: boolean | null;
  temporary_password_issued_at?: string | null;
} | null;
type ExistingSessionState = {
  destination: string;
  email: string;
  hasSchool: boolean;
  role: string | null;
  mustChangePassword: boolean;
};

async function loadProfileSnapshot(user: User): Promise<ProfileSnapshot> {
  const { data: profile, error: profileError } = await fetchProfileByIdentity<{
    role?: string | null;
    school_id?: string | null;
    must_change_password?: boolean | null;
    temporary_password_issued_at?: string | null;
  }>(
    supabase as any,
    user.id,
    "role, school_id, must_change_password, temporary_password_issued_at",
    user.email
  );

  if (profileError) throw profileError;
  if (!profile) return null;

  return {
    role: profile.role ?? null,
    school_id: profile.school_id ?? null,
    must_change_password: profile.must_change_password ?? null,
    temporary_password_issued_at: profile.temporary_password_issued_at ?? null,
  };
}

function buildDestination(user: User, profile: ProfileSnapshot, redirectTo?: string | null) {
  const mustChangePassword = profile?.must_change_password === true;

  if (mustChangePassword) {
    return FIRST_LOGIN_PATH;
  }

  return resolveOnboardingPath({
    role: profile?.role,
    emailVerified: Boolean(user.email_confirmed_at),
    hasSchool: Boolean(profile?.school_id),
    mustChangePassword: false,
    redirectTo,
  });
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthPageShell>
        <section className="w-full max-w-[440px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
            </div>
          </div>
        </section>
      </AuthPageShell>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [continuingSession, setContinuingSession] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingSession, setExistingSession] = useState<ExistingSessionState | null>(null);
  const [cooldown, setCooldown] = useState<{ email: string; until: number } | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const enteredEmail = String(watch("email") || "").trim().toLowerCase();
  const cooldownState =
    cooldown && cooldown.email === enteredEmail
      ? getLoginCooldownState(cooldown.until, cooldownNow)
      : { active: false, remainingSeconds: 0 };

  // Auto-focus email input on mount
  useEffect(() => {
    const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]');
    if (emailInput && !existingSession) {
      emailInput.focus();
    }
  }, [existingSession]);

  useEffect(() => {
    if (!cooldown?.until) {
      return;
    }

    setCooldownNow(Date.now());
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldown?.until]);

  useEffect(() => {
    if (cooldown && !getLoginCooldownState(cooldown.until, cooldownNow).active) {
      setCooldown(null);
    }
  }, [cooldown, cooldownNow]);

  useEffect(() => {
    let active = true;

    const inspectExistingSession = async () => {
      setSessionLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          setExistingSession(null);
          return;
        }

        const profile = await loadProfileSnapshot(session.user);
        if (!active) return;

        setExistingSession({
          destination: buildDestination(session.user, profile, redirectTo),
          email: session.user.email ?? "Signed-in user",
          hasSchool: Boolean(profile?.school_id),
          role: profile?.role ?? null,
          mustChangePassword: profile?.must_change_password === true,
        });
      } catch (sessionError: any) {
        if (!active) return;
        console.warn("[LoginPage.inspectExistingSession()] Session inspection failed", {
          message: sessionError?.message || "Unable to inspect current session",
        });
        setExistingSession(null);
      } finally {
        if (active) setSessionLoading(false);
      }
    };

    inspectExistingSession();

    return () => {
      active = false;
    };
  }, [redirectTo]);

  const continueToWorkspace = async () => {
    if (!existingSession?.destination) return;

    setContinuingSession(true);
    setError(null);

    try {
      router.replace(existingSession.destination);
      router.refresh();
    } finally {
      setContinuingSession(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    setSwitchingAccount(true);
    setError(null);

    try {
      await supabase.auth.signOut();
      setExistingSession(null);
    } catch (signOutError: any) {
      setError(signOutError?.message || "Unable to clear the current session");
    } finally {
      setSwitchingAccount(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      if (cooldownState.active) {
        setError(`Too many login attempts. Try again in ${cooldownState.remainingSeconds} seconds.`);
        return;
      }

      if (existingSession) {
        await supabase.auth.signOut();
        setExistingSession(null);
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[LoginPage.onSubmit()] Attempting sign-in", {
          email: data.email.trim().toLowerCase(),
        });
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // Clear any rate limit cooldown on successful login
      clearLoginCooldown();

      const emailVerified = Boolean(authData.user.email_confirmed_at);
      if (process.env.NODE_ENV === "development") {
        console.info("[LoginPage.onSubmit()] Sign-in succeeded", {
          userId: authData.user.id,
          emailVerified,
        });
      }

      if (!emailVerified) {
        if (process.env.NODE_ENV === "development") {
          console.info("[LoginPage.onSubmit()] Redirecting to email verification", {
            userId: authData.user.id,
          });
        }
        router.replace(`/verify-email?email=${encodeURIComponent(data.email)}&userId=${authData.user.id}`);
        router.refresh();
        return;
      }

      const resolvedProfile = await loadProfileSnapshot(authData.user);

      if (process.env.NODE_ENV === "development") {
        console.info("[LoginPage.onSubmit()] Loaded profile snapshot", {
          userId: authData.user.id,
          role: resolvedProfile?.role || null,
          hasSchoolId: Boolean(resolvedProfile?.school_id),
        });
      }

      const destination = buildDestination(authData.user, resolvedProfile, redirectTo);

      if (process.env.NODE_ENV === "development") {
        console.info("[LoginPage.onSubmit()] Resolved post-login destination", {
          userId: authData.user.id,
          role: resolvedProfile?.role || null,
          hasSchool: Boolean(resolvedProfile?.school_id),
          destination,
          redirectTo,
        });
      }

      // Check MFA enrollment before final redirect
      const mfaResponse = await fetch("/api/auth/mfa/factors");
      if (mfaResponse.ok) {
        const mfaJson = await mfaResponse.json();
        const factors: Array<{ status: string }> = mfaJson.data?.factors ?? [];
        const hasVerifiedMfa = factors.some((f) => f.status === "verified");

        if (hasVerifiedMfa) {
          const mfaUrl = new URL(MFA_CHALLENGE_PATH, window.location.origin);
          mfaUrl.searchParams.set("returnTo", destination);
          router.replace(mfaUrl.pathname + mfaUrl.search);
          router.refresh();
          return;
        }
      }

      router.replace(destination);
      router.refresh();
    } catch (err: any) {
      const rateLimit = getAuthRateLimitState(err);
      if (rateLimit.isRateLimited) {
        const nextCooldown = buildLoginCooldown(rateLimit.retryAfterSeconds, Date.now());
        setCooldown({
          email: String(data.email || "").trim().toLowerCase(),
          until: nextCooldown.until,
        });
        setCooldownNow(Date.now());
        setError(rateLimit.message);
        return;
      }

      console.warn("[LoginPage.onSubmit()] Sign-in failed", {
        message: err?.message || "Invalid login credentials",
      });
      setError(err?.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };
  const cooldownMessage = cooldownState.active
    ? `Too many login attempts. Try again in ${cooldownState.remainingSeconds} seconds.`
    : null;
  const authMessage = cooldownMessage || error;
  const authSuccess =
    searchParams.get("verified") === "true"
      ? "Email verified. Sign in to continue."
      : searchParams.get("reset") === "success"
        ? "Password updated. Sign in with your new password."
        : null;

  return (
    <AuthPageShell>
        <section className="w-full max-w-[440px]">
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <div className="mb-4 h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/icon.png" alt="ZamSchool OS" width={56} height={56} className="h-full w-full object-cover" priority />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-slate-950">ZamSchool OS</p>
              <p className="text-sm font-medium text-slate-500">School operating workspace</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-normal text-slate-950">Sign in to school</h1>
              <p className="mt-2 text-sm text-slate-500">
                Access your admin, teacher, parent, or student workspace.
              </p>
            </div>

            {authSuccess ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            ) : null}

            {authMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{authMessage}</span>
              </div>
            )}

            {sessionLoading ? (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                <span>Checking for an active session...</span>
              </div>
            ) : existingSession ? (
              <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-slate-700">
                <p className="text-sm font-semibold text-sky-700">Active session detected</p>
                <p className="mt-2 text-sm">
                  {existingSession.email}
                  {existingSession.role ? ` is already signed in as ${existingSession.role.toLowerCase()}.` : " is already signed in."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {existingSession.mustChangePassword
                    ? "This managed account must finish first-login setup before entering the workspace."
                    : existingSession.hasSchool
                    ? "Continue to workspace, or switch to another account first if you want to use teacher credentials created by an admin."
                    : "This account still needs onboarding. Continue to finish setup or switch accounts."}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={continueToWorkspace}
                    disabled={continuingSession || switchingAccount}
                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                  >
                    {continuingSession ? "Opening workspace..." : "Continue to workspace"}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseAnotherAccount}
                    disabled={continuingSession || switchingAccount}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                  >
                    {switchingAccount ? "Clearing session..." : "Use another account"}
                  </button>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
                <input
                  {...register("email")}
                  type="email"
                  className={cn(
                    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
                    errors.email && "border-red-400 focus:ring-red-400"
                  )}
                  placeholder="name@school.com"
                />
                {errors.email && <p className="mt-2 text-xs font-medium text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className={cn(
                      "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-950 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
                      errors.password && "border-red-400 focus:ring-red-400"
                    )}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-xs font-medium text-red-600">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || switchingAccount || cooldownState.active}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-center text-sm text-slate-500">
                New school setup?{" "}
                <Link href="/register" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
                  Register your school
                </Link>
              </p>
            </div>
          </div>
        </section>
    </AuthPageShell>
  );
}
