"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Hash,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  KeyRound,
  Sparkles,
  School,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { cn } from "@/lib/utils";

// ── Zambian Provinces & Districts ────────────────────────────────────────────

const ZAMBIAN_PROVINCES = [
  "Central",
  "Copperbelt",
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western",
];

const ZAMBIAN_DISTRICTS: Record<string, string[]> = {
  Central: [
    "Chibombo",
    "Kabwe",
    "Kapiri Mposhi",
    "Mkushi",
    "Mumbwa",
    "Serenje",
    "Chisamba",
    "Itezhi-Tezhi",
    "Ngabwe",
  ],
  Copperbelt: [
    "Chililabombwe",
    "Chingola",
    "Kalulushi",
    "Kitwe",
    "Luanshya",
    "Lufwanyama",
    "Masaiti",
    "Mpongwe",
    "Mufulira",
    "Ndola",
  ],
  Eastern: [
    "Chadiza",
    "Chipata",
    "Katete",
    "Lundazi",
    "Mambwe",
    "Nyimba",
    "Petauke",
    "Sinda",
    "Vubwi",
    "Chipangali",
  ],
  Luapula: [
    "Chembe",
    "Chienge",
    "Kawambwa",
    "Lunga",
    "Mansa",
    "Milenge",
    "Mwansabombwe",
    "Mweru",
    "Nchelenge",
    "Samfya",
  ],
  Lusaka: [
    "Chilanga",
    "Chongwe",
    "Kafue",
    "Luangwa",
    "Lusaka",
    "Rufunsa",
    "Shibuyunji",
  ],
  Muchinga: [
    "Chama",
    "Chinsali",
    "Isoka",
    "Kanchibiya",
    "Lavushimanda",
    "Mafinga",
    "Mpika",
    "Nakonde",
    "Shiwang'andu",
  ],
  Northern: [
    "Chilubi",
    "Kaputa",
    "Kasama",
    "Lunte",
    "Luwingu",
    "Mbala",
    "Mporokoso",
    "Mpulungu",
    "Mungwi",
    "Nsama",
    "Senga",
  ],
  "North-Western": [
    "Chavuma",
    "Ikelenge",
    "Kabompo",
    "Kasempa",
    "Manyinga",
    "Mufumbwe",
    "Mwinilunga",
    "Solwezi",
    "Zambezi",
  ],
  Southern: [
    "Chikankata",
    "Choma",
    "Gwembe",
    "Itezhi-Tezhi",
    "Kalomo",
    "Kazungula",
    "Livingstone",
    "Mazabuka",
    "Monze",
    "Namwala",
    "Pemba",
    "Siavonga",
    "Sinazongwe",
  ],
  Western: [
    "Kalabo",
    "Kaoma",
    "Limulunga",
    "Luampa",
    "Lukulu",
    "Mongu",
    "Mulobezi",
    "Mwandi",
    "Nalolo",
    "Nkeyema",
    "Senanga",
    "Sesheke",
    "Shang'ombo",
    "Sikongo",
  ],
};

// ── Validation Schemas ────────────────────────────────────────────────────────

const codeSchema = z.object({
  accessCode: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

const accountSchema = z.object({
  headTeacherName: z
    .string()
    .min(2, "Head Teacher name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^(\+?260|0)?[97]\d{8}$/, "Enter a valid Zambian phone number (e.g. +260 97 123 4567)"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  schoolCode: z
    .string()
    .min(4, "School code must be at least 4 characters")
    .max(12, "School code must be at most 12 characters")
    .regex(/^[A-Za-z0-9]+$/, "School code must contain only letters and numbers"),
  address: z.string().min(1, "Address is required"),
  emisCode: z.string().min(1, "EMIS code is required"),
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  schoolType: z.string().min(1, "School type is required"),
  ownershipType: z.string().min(1, "Ownership type is required"),
});

type CodeFormValues = z.infer<typeof codeSchema>;
type AccountFormValues = z.infer<typeof accountSchema>;
type SchoolFormValues = z.infer<typeof schoolSchema>;

const REGISTER_DRAFT_KEY = "zamschool_register_draft";

type RegisterDraft = {
  verifiedCode: string;
  codeScope: VerifiedCodeScope | null;
  accountData: AccountFormValues;
  createdUserId: string;
};

type VerifiedCodeScope = {
  province: string | null;
  district: string | null;
  schoolType: string | null;
  ownershipType: string | null;
};

// ── Helper: Password strength ──────────────────────────────────────────────────

function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
  width: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 0, label: "Very weak", color: "bg-red-400", width: "w-1/5" },
    { score: 1, label: "Weak", color: "bg-orange-400", width: "w-2/5" },
    { score: 2, label: "Fair", color: "bg-amber-400", width: "w-3/5" },
    { score: 3, label: "Good", color: "bg-lime-400", width: "w-4/5" },
    { score: 4, label: "Strong", color: "bg-emerald-400", width: "w-full" },
  ];
  return levels[Math.min(score, 4)];
}

// ── Helper Components ─────────────────────────────────────────────────────────

const baseInput =
  "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2";
const inputClass = (err?: string) =>
  cn(
    baseInput,
    err
      ? "border-red-300 focus:ring-red-400"
      : "border-slate-200 focus:ring-emerald-400 hover:border-slate-300",
  );

const readOnlyInputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 cursor-not-allowed";

// ── OTP Input for Access Code ─────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const r0 = useRef<HTMLInputElement>(null);
  const r1 = useRef<HTMLInputElement>(null);
  const r2 = useRef<HTMLInputElement>(null);
  const r3 = useRef<HTMLInputElement>(null);
  const r4 = useRef<HTMLInputElement>(null);
  const r5 = useRef<HTMLInputElement>(null);
  const inputs = [r0, r1, r2, r3, r4, r5];

  const handleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").padEnd(6, "").slice(0, 6));

    const next = inputs[index + 1]?.current;
    if (digit && next) {
      next.focus();
      next.select();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      const prev = inputs[index - 1]?.current;
      if (prev) {
        prev.focus();
        prev.select();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(pasted.padEnd(6, ""));
    const focusIdx = Math.min(pasted.length, 5);
    inputs[focusIdx]?.current?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center justify-center gap-2 sm:gap-3"
        onPaste={handlePaste}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={inputs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              "h-14 w-12 sm:h-16 sm:w-14 rounded-xl border-2 text-center text-xl sm:text-2xl font-bold transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-1",
              error
                ? "border-red-300 focus:ring-red-400 text-red-600"
                : value[i]
                  ? "border-emerald-400 focus:ring-emerald-400 text-slate-900 bg-emerald-50/50"
                  : "border-slate-200 focus:ring-emerald-400 text-slate-700 hover:border-slate-300",
            )}
          />
        ))}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  step,
  current,
  label,
}: {
  step: number;
  current: number;
  label: string;
}) {
  const done = current > step;
  const active = current === step;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
          done && "bg-emerald-500 text-white shadow-sm shadow-emerald-200",
          active &&
            "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md",
          !done &&
            !active &&
            "border-2 border-slate-200 bg-white text-slate-400",
        )}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <div className="hidden sm:block">
        <span
          className={cn(
            "text-sm font-semibold transition-colors",
            active && "text-slate-900",
            done && "text-emerald-600",
            !done && !active && "text-slate-400",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </AuthPageShell>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [stepTransition, setStepTransition] = useState(false);

  // Data carried across steps
  const [verifiedCode, setVerifiedCode] = useState("");
  const [codeScope, setCodeScope] = useState<VerifiedCodeScope | null>(null);
  const [accountData, setAccountData] = useState<AccountFormValues | null>(
    null,
  );
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Step 1 form ──
  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { accessCode: "" },
  });
  const codeValue = codeForm.watch("accessCode");

  // ── Step 2 form ──
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
  });
  const accountPassword = accountForm.watch("password") || "";
  const passwordStrength = getPasswordStrength(accountPassword);

  // ── Step 3 form ──
  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
  });

  useEffect(() => {
    if (searchParams.get("resume") !== "school") return;

    try {
      const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
      if (!raw) return;

      const draft = JSON.parse(raw) as RegisterDraft;
      if (!draft?.accountData || !draft.createdUserId || !draft.verifiedCode)
        return;

      setVerifiedCode(draft.verifiedCode);
      setCodeScope(draft.codeScope);
      setAccountData(draft.accountData);
      setCreatedUserId(draft.createdUserId);
      if (draft.codeScope?.province) {
        setSelectedProvince(draft.codeScope.province);
        schoolForm.setValue("province", draft.codeScope.province);
      }
      if (draft.codeScope?.district)
        schoolForm.setValue("district", draft.codeScope.district);
      if (draft.codeScope?.schoolType)
        schoolForm.setValue("schoolType", draft.codeScope.schoolType);
      if (draft.codeScope?.ownershipType) {
        schoolForm.setValue("ownershipType", draft.codeScope.ownershipType);
      }
      setStep(3);
    } catch {
      // ignore corrupt draft
    }
  }, [searchParams, schoolForm]);

  // ── Step 1: Verify access code ───────────────────────────────────────────────
  const onVerifyCode = async (data: CodeFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.accessCode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Verification failed");
      setVerifiedCode(data.accessCode);
      const scope = (result.data || null) as VerifiedCodeScope | null;
      setCodeScope(scope);
      if (scope?.province) {
        setSelectedProvince(scope.province);
        schoolForm.setValue("province", scope.province);
      }
      if (scope?.district) schoolForm.setValue("district", scope.district);
      if (scope?.schoolType)
        schoolForm.setValue("schoolType", scope.schoolType);
      if (scope?.ownershipType)
        schoolForm.setValue("ownershipType", scope.ownershipType);
      setStepTransition(true);
      setTimeout(() => {
        setStep(2);
        setStepTransition(false);
      }, 150);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Create principal auth account ────────────────────────────────────
  const onCreateAccount = async (data: AccountFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name:
              data.headTeacherName.split(" ").slice(0, -1).join(" ") ||
              data.headTeacherName,
            last_name:
              data.headTeacherName.split(" ").slice(-1).join(" ") || "",
            role: "principal",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      setAccountData(data);
      setCreatedUserId(authData.user.id);

      const draft: RegisterDraft = {
        verifiedCode,
        codeScope,
        accountData: data,
        createdUserId: authData.user.id,
      };
      sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));

      const verifyNext = encodeURIComponent("/register?resume=school");
      router.replace(
        `/verify-email?email=${encodeURIComponent(data.email)}&userId=${authData.user.id}&next=${verifyNext}`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Account creation failed";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("user already")
      ) {
        setError(
          "An account with this email already exists. Please sign in instead.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Register school ───────────────────────────────────────────────────
  const onRegisterSchool = async (data: SchoolFormValues) => {
    if (!accountData || !createdUserId) {
      setError("Session data lost. Please start again from step 1.");
      setStep(1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error(
          "Your session expired. Please sign in again to complete registration.",
        );
      }

      const res = await fetch("/api/auth/register-school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: accountData.email,
          headTeacherName: accountData.headTeacherName,
          phone: accountData.phone,
          schoolName: data.schoolName,
          schoolCode: data.schoolCode,
          address: data.address,
          emisCode: data.emisCode,
          province: data.province,
          district: data.district,
          schoolType: data.schoolType,
          ownershipType: data.ownershipType,
          accessCode: verifiedCode,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Registration failed");

      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
      router.replace("/app/principal");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (msg.includes("session expired") || msg.includes("Session expired")) {
        setError("Your session expired. Please sign in again to complete registration.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AuthPageShell contentClassName="py-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {step === 2
              ? "Create Your Account"
              : step === 3
                ? "Register Your School"
                : "Let's Set Up Your School"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-sm">
            {step === 2 &&
              "Just a few details to get you started as the school leader"}
            {step === 3 && "Tell us about your school — you're almost done"}
            {step === 1 &&
              "Enter the 6-digit access code provided by your ZamSchool Super Admin"}
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <StepIndicator step={1} current={step} label="Verify Code" />
            <div
              className={cn(
                "h-0.5 flex-1 mx-3 rounded-full transition-colors duration-500",
                step > 1 ? "bg-emerald-400" : "bg-slate-200",
              )}
            />
            <StepIndicator step={2} current={step} label="Your Account" />
            <div
              className={cn(
                "h-0.5 flex-1 mx-3 rounded-full transition-colors duration-500",
                step > 2 ? "bg-emerald-400" : "bg-slate-200",
              )}
            />
            <StepIndicator step={3} current={step} label="School Details" />
          </div>
        </div>

        {/* Main Card */}
        <div className={cn(
          "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-200",
          stepTransition ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        )}>
          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Something went wrong</p>
                <p>{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* ═══════════════ STEP 1: ACCESS CODE ═══════════════ */}
          {step === 1 && (
            <form
              onSubmit={codeForm.handleSubmit(onVerifyCode)}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">
                    Super Admin Access Code Required
                  </h3>
                  <p className="mt-1 text-xs text-amber-700/80 leading-relaxed">
                    Each new school registration requires a unique 6-digit code
                    issued by a ZamSchool OS Super Admin. Students and parents
                    do not register through this portal — the Head Teacher adds
                    them after setup.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-center text-sm font-semibold text-slate-700">
                  Enter your 6-digit access code
                </label>
                <OtpInput
                  value={codeValue}
                  onChange={(val) => codeForm.setValue("accessCode", val)}
                  error={codeForm.formState.errors.accessCode?.message}
                />
              </div>

              <button
                type="submit"
                disabled={loading || codeValue.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify & Continue
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">
                    Need help?
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500">
                Don&apos;t have an access code? Contact your{" "}
                <span className="font-semibold text-slate-700">
                  ZamSchool OS Super Admin
                </span>{" "}
                to request one.
              </p>
            </form>
          )}

          {/* ═══════════════ STEP 2: HEAD TEACHER ACCOUNT ═══════════════ */}
          {step === 2 && (
            <form
              onSubmit={accountForm.handleSubmit(onCreateAccount)}
              className="space-y-5"
            >
              {/* Verified badge */}
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm text-emerald-800">
                  Code{" "}
                  <span className="font-mono font-bold tracking-wider">
                    {verifiedCode}
                  </span>{" "}
                  verified — you&apos;re authorised to register
                </div>
              </div>

              {/* Welcome Section */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-900">
                      Welcome, School Leader!
                    </h3>
                    <p className="mt-1 text-sm text-emerald-700/80 leading-relaxed">
                      As the <strong>Head Teacher</strong>, you are the primary
                      account holder for your school. You&apos;ll be able to
                      invite other staff members (administrators, teachers,
                      bursar, etc.) once your school is set up.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700/70">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Full access to all school features
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700/70">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Manage staff, students & parents
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700/70">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Oversee finances & academic records
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields — Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>Personal Information</span>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="headTeacherName"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...accountForm.register("headTeacherName")}
                    className={inputClass(
                      accountForm.formState.errors.headTeacherName?.message,
                    )}
                    placeholder="e.g. John Bwalya"
                    id="headTeacherName"
                    autoComplete="name"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Enter your full legal name as it will appear in school
                    records.
                  </p>
                  {accountForm.formState.errors.headTeacherName && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />{" "}
                      {accountForm.formState.errors.headTeacherName.message}
                    </p>
                  )}
                </div>

                {/* Email + Phone Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        {...accountForm.register("email")}
                        type="email"
                        className={cn(
                          inputClass(
                            accountForm.formState.errors.email?.message,
                          ),
                          "pl-10",
                        )}
                        placeholder="headteacher@school.edu.zm"
                        id="email"
                        autoComplete="email"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      This will be your login username.
                    </p>
                    {accountForm.formState.errors.email && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {accountForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        {...accountForm.register("phone")}
                        type="tel"
                        className={cn(
                          inputClass(
                            accountForm.formState.errors.phone?.message,
                          ),
                          "pl-10",
                        )}
                        placeholder="+260 97 123 4567"
                        id="phone"
                        autoComplete="tel"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Zambian number for system notifications and account recovery.
                    </p>
                    {accountForm.formState.errors.phone && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {accountForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    <Lock className="w-4 h-4" />
                    <span>Account Security</span>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Create Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        {...accountForm.register("password")}
                        type={showPassword ? "text" : "password"}
                        className={cn(
                          inputClass(
                            accountForm.formState.errors.password?.message,
                          ),
                          "pl-10 pr-12",
                        )}
                        placeholder="Minimum 8 characters"
                        id="password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 transition-colors hover:text-slate-700"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Password strength bar */}
                    {accountPassword && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                passwordStrength.color,
                                passwordStrength.width,
                              )}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-500 min-w-[4rem] text-right">
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-2.5 space-y-1">
                      <PasswordRule
                        met={accountPassword.length >= 8}
                        label="At least 8 characters"
                      />
                      <PasswordRule
                        met={/[A-Z]/.test(accountPassword)}
                        label="One uppercase letter (A-Z)"
                      />
                      <PasswordRule
                        met={/[0-9]/.test(accountPassword)}
                        label="One number (0-9)"
                      />
                    </div>
                    {accountForm.formState.errors.password && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {accountForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-semibold mb-0.5">
                    Please use a real email address
                  </p>
                  <p className="leading-relaxed">
                    Your email will be used for account verification, password
                    recovery, and official school communications. It cannot be
                    changed without Super Admin assistance.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating
                      account...
                    </>
                  ) : (
                    <>
                      Continue to School Details{" "}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════ STEP 3: SCHOOL DETAILS ═══════════════ */}
          {step === 3 && (
            <form
              onSubmit={schoolForm.handleSubmit(onRegisterSchool)}
              className="space-y-5"
            >
              <div className="flex items-start gap-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">
                    School Information
                  </h3>
                  <p className="mt-1 text-xs text-blue-700/70 leading-relaxed">
                    Enter your school&apos;s official details. Fields pre-filled
                    from your access code are read-only.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="School Name"
                  icon={School}
                  error={schoolForm.formState.errors.schoolName?.message}
                  hint="Official registered name"
                >
                  <input
                    {...schoolForm.register("schoolName")}
                    className={inputClass(
                      schoolForm.formState.errors.schoolName?.message,
                    )}
                    placeholder="ABC Secondary School"
                    id="schoolName"
                  />
                </Field>

                <Field
                  label="School Code"
                  icon={Hash}
                  error={schoolForm.formState.errors.schoolCode?.message}
                  hint="Short unique identifier (4-12 chars, e.g. ABC123)"
                >
                  <input
                    {...schoolForm.register("schoolCode")}
                    className={inputClass(
                      schoolForm.formState.errors.schoolCode?.message,
                    )}
                    placeholder="ABC123"
                    id="schoolCode"
                  />
                </Field>

                <Field
                  label="Address"
                  icon={MapPin}
                  error={schoolForm.formState.errors.address?.message}
                  hint="Physical location"
                  fullWidth
                >
                  <input
                    {...schoolForm.register("address")}
                    className={inputClass(
                      schoolForm.formState.errors.address?.message,
                    )}
                    placeholder="123 Main Street, Town"
                    id="address"
                  />
                </Field>

                <Field
                  label="EMIS Code"
                  error={schoolForm.formState.errors.emisCode?.message}
                  hint="Ministry-assigned identifier"
                >
                  <input
                    {...schoolForm.register("emisCode")}
                    className={inputClass(
                      schoolForm.formState.errors.emisCode?.message,
                    )}
                    placeholder="EMIS-12345"
                    id="emisCode"
                  />
                </Field>

                <Field
                  label="Province"
                  error={schoolForm.formState.errors.province?.message}
                >
                  {codeScope?.province ? (
                    <div className={readOnlyInputClass}>
                      {codeScope.province}
                    </div>
                  ) : (
                    <select
                      {...schoolForm.register("province")}
                      onChange={(e) => {
                        schoolForm.register("province").onChange(e);
                        setSelectedProvince(e.target.value);
                        schoolForm.setValue("district", "");
                      }}
                      className={inputClass(
                        schoolForm.formState.errors.province?.message,
                      )}
                      id="province"
                    >
                      <option value="">Select province...</option>
                      {ZAMBIAN_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  label="District"
                  error={schoolForm.formState.errors.district?.message}
                >
                  {codeScope?.district ? (
                    <div className={readOnlyInputClass}>
                      {codeScope.district}
                    </div>
                  ) : (
                    <select
                      {...schoolForm.register("district")}
                      disabled={!selectedProvince}
                      className={cn(
                        inputClass(
                          schoolForm.formState.errors.district?.message,
                        ),
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                      id="district"
                    >
                      <option value="">
                        {selectedProvince
                          ? "Select district..."
                          : "Select province first"}
                      </option>
                      {selectedProvince &&
                        ZAMBIAN_DISTRICTS[selectedProvince]?.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                    </select>
                  )}
                </Field>

                <Field
                  label="School Type"
                  error={schoolForm.formState.errors.schoolType?.message}
                >
                  {codeScope?.schoolType ? (
                    <div className={readOnlyInputClass}>
                      {codeScope.schoolType}
                    </div>
                  ) : (
                    <select
                      {...schoolForm.register("schoolType")}
                      className={inputClass(
                        schoolForm.formState.errors.schoolType?.message,
                      )}
                      id="schoolType"
                    >
                      <option value="">Select type...</option>
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                      <option value="High School">High School</option>
                      <option value="Combined">Combined</option>
                    </select>
                  )}
                </Field>

                <Field
                  label="Ownership"
                  error={schoolForm.formState.errors.ownershipType?.message}
                >
                  {codeScope?.ownershipType ? (
                    <div className={readOnlyInputClass}>
                      {codeScope.ownershipType}
                    </div>
                  ) : (
                    <select
                      {...schoolForm.register("ownershipType")}
                      className={inputClass(
                        schoolForm.formState.errors.ownershipType?.message,
                      )}
                      id="ownershipType"
                    >
                      <option value="">Select...</option>
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                      <option value="Grant Aided">Grant Aided</option>
                      <option value="Faith-Based">Faith-Based</option>
                    </select>
                  )}
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registering school...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Complete Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
}

// ── Reusable Components ────────────────────────────────────────────────────────

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          met
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-100 text-slate-300",
        )}
      >
        {met ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
      </div>
      <span className={cn(met ? "text-emerald-700" : "text-slate-400")}>
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  error,
  hint,
  children,
  fullWidth,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(fullWidth && "sm:col-span-2")}>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
