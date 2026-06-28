"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  FileText,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Monitor,
  School,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";

import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { useWorkspaceContext } from "@/components/WorkspaceContextProvider";
import { useWorkspaceSummary } from "@/components/workspace/useWorkspaceSummary";
import { metricsToStatCards } from "@/components/workspace/metricIcons";

import { FocusPills } from "@/components/workspace/FocusPills";
import type { HeroAccent } from "@/components/workspace/heroAccents";
import { ModuleCard } from "@/components/workspace/ModuleCard";
import { SectionIntro } from "@/components/workspace/SectionIntro";

type WorkspaceKey =
  | "deputy_head"
  | "bursar"
  | "guidance_office"
  | "academic_admin"
  | "hr_admin"
  | "ict_admin"
  | "discipline_admin"
  | "registrar";

type Module = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

type WorkspaceConfig = {
  eyebrow: string;
  title: string;
  summary: string;
  focus: string[];
  accent: HeroAccent;
  modules: Module[];
  fallbackMetrics: {
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
  }[];
  quickLink?: {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
  };
  metricIcons: ComponentType<{ className?: string }>[];
};

const CONFIG: Record<WorkspaceKey, WorkspaceConfig> = {
  deputy_head: {
    eyebrow: "Deputy Head workspace",
    title: "Academic quality & oversight",
    summary:
      "Oversee academic performance, review timetables, monitor attendance trends, and validate examination readiness across all classes.",
    focus: [
      "Review timetables",
      "Monitor attendance",
      "Exam results overview",
      "Academic performance",
      "Staff quality audit",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Classes", value: "—", icon: GraduationCap },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
    ],
    quickLink: {
      href: "/app/admin/timetable",
      label: "Review timetables",
      icon: CalendarClock,
    },
    metricIcons: [Users, Users, GraduationCap, ClipboardCheck],
    modules: [
      module(
        "Timetable review",
        "Validate class timetables and detect scheduling conflicts.",
        "/app/admin/timetable",
        CalendarClock,
        "indigo",
      ),
      module(
        "Attendance trends",
        "School-wide absence and punctuality patterns with 7-day view.",
        "/app/admin/attendance",
        ClipboardCheck,
        "sky",
      ),
      module(
        "Academic results",
        "Review exam results and subject performance across classes.",
        "/app/admin/assignments",
        TrendingUp,
        "violet",
      ),
      module(
        "Classes & subjects",
        "Class groupings, subject catalog, and teacher assignments.",
        "/app/admin/classes",
        GraduationCap,
        "amber",
      ),
      module(
        "Staff directory",
        "View teacher and staff profiles (read-only).",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Announcements",
        "Broadcast academic notices and policy updates.",
        "/app/announcements",
        Megaphone,
        "rose",
      ),
      module(
        "Academic reports",
        "Generate and review term and annual academic reports.",
        "/app/admin/academic",
        FileBarChart2,
        "slate",
      ),
      module(
        "Messages",
        "Communicate with department heads and leadership.",
        "/app/messages",
        MessageSquare,
        "sky",
      ),
    ],
  },
  bursar: {
    eyebrow: "Bursar workspace",
    title: "Finance control room",
    summary:
      "Fees, payments, receipts, and financial reporting — without unrelated discipline settings.",
    focus: [
      "Record payments",
      "Review balances",
      "Track fees",
      "Prepare reports",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Collected", value: "—", icon: CreditCard },
      { label: "Pending", value: "—", icon: CreditCard },
      { label: "Students", value: "—", icon: Users },
      { label: "Alerts", value: "—", icon: Bell },
    ],
    quickLink: {
      href: "/app/payments/fees",
      label: "Manage fees",
      icon: CreditCard,
    },
    metricIcons: [CreditCard, CreditCard, Users, Bell],
    modules: [
      module(
        "Finance records",
        "Income and expense records.",
        "/app/admin/finance",
        FileBarChart2,
        "amber",
      ),
      module(
        "Fee management",
        "Fees, billing, and balances.",
        "/app/payments/fees",
        CreditCard,
        "emerald",
      ),
      module(
        "Student accounts",
        "Payment status by learner.",
        "/app/payments/students",
        Users,
        "sky",
      ),
      module(
        "Payments dashboard",
        "Focused payments workspace.",
        "/app/payments",
        BarChart3,
        "indigo",
      ),
      module(
        "Notifications",
        "Fee alerts and reminders.",
        "/app/notifications",
        Bell,
        "rose",
      ),
      module(
        "Messages",
        "Coordinate with leadership and guardians.",
        "/app/messages",
        MessageSquare,
        "slate",
      ),
    ],
  },
  guidance_office: {
    eyebrow: "Guidance office workspace",
    title: "Student welfare desk",
    summary:
      "Counseling, welfare follow-up, discipline reporting, and sensitive student communication.",
    focus: [
      "Protect welfare",
      "Review behavior",
      "Coordinate support",
      "Document concerns",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
      { label: "Late (7d)", value: "—", icon: AlertTriangle },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: {
      href: "/app/admin/users",
      label: "Student directory",
      icon: Users,
    },
    metricIcons: [Users, ClipboardCheck, AlertTriangle, MessageSquare],
    modules: [
      module(
        "Student directory",
        "Profiles and guardian context.",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Attendance signals",
        "Patterns that may need support.",
        "/app/admin/attendance",
        ClipboardCheck,
        "sky",
      ),
      module(
        "Messages",
        "Private staff and leadership communication.",
        "/app/messages",
        MessageSquare,
        "indigo",
      ),
      module(
        "Events",
        "Counseling sessions and welfare events.",
        "/app/events",
        CalendarClock,
        "rose",
      ),
      module(
        "Notifications",
        "Student welfare alerts.",
        "/app/notifications",
        Bell,
        "slate",
      ),
    ],
  },
  academic_admin: {
    eyebrow: "Academic admin workspace",
    title: "Academic systems & curriculum desk",
    summary:
      "Design class timetables, assign teachers, configure ECZ grading scales, manage academic years and terms, and coordinate all curriculum structures.",
    focus: [
      "Build class timetables",
      "Configure ECZ grading",
      "Manage academic years & terms",
      "Resolve timetable conflicts",
      "Exam & assessment setup",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Classes", value: "—", icon: GraduationCap },
      { label: "Subjects", value: "—", icon: BookOpen },
      { label: "Assignments", value: "—", icon: ClipboardCheck },
      { label: "Teachers", value: "—", icon: Users },
    ],
    quickLink: {
      href: "/app/admin/timetable",
      label: "Timetable builder",
      icon: CalendarClock,
    },
    metricIcons: [GraduationCap, BookOpen, ClipboardCheck, Users],
    modules: [
      module(
        "Timetable builder",
        "Create and manage per-class timetables with teacher period assignments.",
        "/app/admin/timetable",
        CalendarClock,
        "indigo",
      ),
      module(
        "Academic years & terms",
        "Define school years, terms, and activate timetable periods.",
        "/app/admin/academic",
        BookOpen,
        "violet",
      ),
      module(
        "Classes & streams",
        "Class groups, streams, and class teacher supervisors.",
        "/app/admin/classes",
        GraduationCap,
        "sky",
      ),
      module(
        "Subject catalog",
        "Subject definitions, codes, and curriculum structure.",
        "/app/admin/subjects",
        BookOpen,
        "emerald",
      ),
      module(
        "ECZ grading scales",
        "Configure national ECZ and custom school grading rules.",
        "/app/admin/grading-scales",
        School,
        "amber",
      ),
      module(
        "Assignments & exams",
        "Create school-wide assignments and examination events.",
        "/app/admin/assignments",
        ClipboardCheck,
        "rose",
      ),
      module(
        "Attendance overview",
        "Monitor class-level attendance for academic compliance.",
        "/app/admin/attendance",
        BarChart3,
        "slate",
      ),
    ],
  },
  hr_admin: {
    eyebrow: "HR admin workspace",
    title: "People & staff lifecycle desk",
    summary:
      "Manage staff records, employment data, department assignments, and staff welfare across the school. Staff invitations are handled by the Head Teacher.",
    focus: [
      "Manage employment records",
      "Department structure",
      "Staff welfare",
      "Staff communications",
      "Attendance oversight",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Staff", value: "—", icon: UserCog },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Departments", value: "—", icon: Building2 },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: {
      href: "/app/admin/users",
      label: "Staff directory",
      icon: Users,
    },
    metricIcons: [UserCog, Users, Building2, MessageSquare],
    modules: [
      module(
        "Staff directory",
        "Full employee profiles, roles, and contact records.",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Departments & structure",
        "School departments, HODs, and staff assignments.",
        "/app/admin/school",
        Building2,
        "indigo",
      ),
      module(
        "Bulk staff import",
        "Import staff and teacher records from CSV/Excel files.",
        "/app/admin/users",
        FolderOpen,
        "violet",
      ),
      module(
        "Messages",
        "Communicate with staff, teachers, and leadership.",
        "/app/messages",
        MessageSquare,
        "rose",
      ),
      module(
        "Notifications",
        "Onboarding alerts, invite acceptances, and account events.",
        "/app/notifications",
        Bell,
        "slate",
      ),
      module(
        "Account settings",
        "HR admin account preferences and notification settings.",
        "/app/settings",
        Settings,
        "sky",
      ),
    ],
  },
  ict_admin: {
    eyebrow: "ICT admin workspace",
    title: "Technical operations & security center",
    summary:
      "Manage user accounts, monitor security audit trails, recover access, configure system settings, and ensure the school platform operates securely and reliably.",
    focus: [
      "Account recovery & access",
      "Security audit review",
      "System configuration",
      "Monitor security events",
      "Platform technical health",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Accounts", value: "—", icon: Users },
      { label: "Audit (7d)", value: "—", icon: ShieldCheck },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Alerts", value: "—", icon: Bell },
    ],
    quickLink: {
      href: "/app/admin/audit",
      label: "Security audit trail",
      icon: ShieldCheck,
    },
    metricIcons: [Users, ShieldCheck, Users, Bell],
    modules: [
      module(
        "User accounts",
        "Account recovery, password resets, and access troubleshooting.",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Security audit trail",
        "Review security-sensitive actions and system-level changes.",
        "/app/admin/audit",
        ShieldCheck,
        "slate",
      ),
      module(
        "School profile & settings",
        "Platform identity, branding, and technical configuration.",
        "/app/admin/school",
        Building2,
        "sky",
      ),
      module(
        "System settings",
        "Configure platform features, integrations, and preferences.",
        "/app/settings",
        Settings,
        "indigo",
      ),
      module(
        "Device & access monitoring",
        "Review active sessions and unusual login activity.",
        "/app/admin/audit",
        Monitor,
        "violet",
      ),
      module(
        "MFA & security keys",
        "Manage multi-factor authentication and security settings.",
        "/app/settings",
        KeyRound,
        "amber",
      ),
      module(
        "Notifications",
        "System alerts, security events, and platform notices.",
        "/app/notifications",
        Bell,
        "rose",
      ),
      module(
        "Messages",
        "Technical support and coordination with leadership.",
        "/app/messages",
        MessageSquare,
        "sky",
      ),
    ],
  },
  discipline_admin: {
    eyebrow: "Discipline workspace",
    title: "Student conduct desk",
    summary:
      "Discipline signals, attendance patterns, student records, and leadership communication.",
    focus: [
      "Review incidents",
      "Track patterns",
      "Coordinate follow-up",
      "Protect records",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
      { label: "Late (7d)", value: "—", icon: AlertTriangle },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: {
      href: "/app/admin/attendance",
      label: "Attendance signals",
      icon: ClipboardCheck,
    },
    metricIcons: [Users, ClipboardCheck, AlertTriangle, MessageSquare],
    modules: [
      module(
        "Student directory",
        "Profiles for follow-up.",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Attendance signals",
        "Absence and punctuality patterns.",
        "/app/admin/attendance",
        ClipboardCheck,
        "sky",
      ),
      module(
        "Messages",
        "Discipline follow-up.",
        "/app/messages",
        MessageSquare,
        "indigo",
      ),
      module(
        "Events",
        "Hearings and interventions.",
        "/app/events",
        CalendarClock,
        "rose",
      ),
      module(
        "Notifications",
        "Behavior and attendance alerts.",
        "/app/notifications",
        Bell,
        "slate",
      ),
    ],
  },
  registrar: {
    eyebrow: "Registrar workspace",
    title: "Admissions, enrolment & records desk",
    summary:
      "Manage student admissions, parent and guardian registration, class placements, transfer requests, and all learner biodata records.",
    focus: [
      "Register & admit students",
      "Link parents & guardians",
      "Process transfer requests",
      "Class placement",
      "Verify learner documents",
    ],
    accent: "sky",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Classes", value: "—", icon: GraduationCap },
      { label: "Parents", value: "—", icon: Users },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
    ],
    quickLink: {
      href: "/app/admin/users",
      label: "Student directory",
      icon: Users,
    },
    metricIcons: [Users, GraduationCap, Users, ClipboardCheck],
    modules: [
      module(
        "Student directory",
        "Full learner profiles, admissions records, and guardian links.",
        "/app/admin/users",
        Users,
        "emerald",
      ),
      module(
        "Bulk learner import",
        "Import new students from CSV/Excel admission files.",
        "/app/admin/users",
        FolderOpen,
        "sky",
      ),
      module(
        "Class placements",
        "Assign learners to classes, streams, and academic groups.",
        "/app/admin/classes",
        GraduationCap,
        "indigo",
      ),
      module(
        "Attendance & enrolment",
        "Enrolment status and early-term attendance overview.",
        "/app/admin/attendance",
        ClipboardCheck,
        "violet",
      ),
      module(
        "Documents & records",
        "Learner biodata, birth certificates, and document tracking.",
        "/app/admin/users",
        FileText,
        "amber",
      ),
      module(
        "Messages",
        "Communicate admissions updates to parents and staff.",
        "/app/messages",
        MessageSquare,
        "rose",
      ),
      module(
        "Notifications",
        "Admission approvals, transfer alerts, and enrolment events.",
        "/app/notifications",
        Bell,
        "sky",
      ),
    ],
  },
};

export default function AdminRoleWorkspace({
  role,
  variant = "full",
}: {
  role: WorkspaceKey;
  variant?: "full" | "tools";
}) {
  const config = CONFIG[role] || CONFIG.ict_admin;
  const { data: workspace } = useWorkspaceContext();
  const { metrics, highlights, loading: metricsLoading } = useWorkspaceSummary();

  const schoolName = workspace?.schoolName || config.title;
  const yearTerm = workspace?.yearTerm || "Role workspace";
  const displayName = workspace?.displayName || "Your account";

  // Build stat cards — live metrics once loaded, fallback skeleton while loading
  const displayStats = metricsLoading || metrics.length === 0
    ? config.fallbackMetrics.map((item, index) => ({
        label: item.label,
        value: metricsLoading ? "…" : item.value,
        hint: undefined,
        icon: item.icon,
        tone: (["sky", "violet", "amber", "emerald"] as const)[index % 4],
      }))
    : metricsToStatCards(metrics, config.metricIcons);

  // FocusPills: prefer live role-specific highlights, fall back to static role focus
  const pillItems = highlights.length > 0 ? highlights : config.focus;

  const pillAccent =
    config.accent === "teal" || config.accent === "emerald"
      ? "teal"
      : config.accent === "indigo" ||
          config.accent === "violet" ||
          config.accent === "rose"
        ? "indigo"
        : "sky";

  return (
    <div className={variant === "tools" ? "space-y-4" : "space-y-4"}>
      {variant === "full" ? (
        <>
          <AdminPageHero
            eyebrow={config.eyebrow}
            title={schoolName}
            description={`Welcome back, ${displayName}. ${config.summary} ${yearTerm}.`}
            accent={config.accent}
            stats={displayStats}
            actions={
              config.quickLink ? (
                <Link
                  href={config.quickLink.href}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <config.quickLink.icon className="h-4 w-4 text-sky-600" />
                  {config.quickLink.label}
                </Link>
              ) : null
            }
          />

          <FocusPills items={pillItems} accent={pillAccent} />
        </>
      ) : null}

      <section>
        <SectionIntro
          title={variant === "tools" ? "Workspace modules" : "Your modules"}
          description={
            variant === "tools"
              ? "Shortcuts to the areas you manage most often."
              : "Open a module to work in your role-scoped area."
          }
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {config.modules.map((item) => (
            <ModuleCard
              key={item.title}
              title={item.title}
              description={item.description}
              href={item.href}
              icon={item.icon}
              tone={item.tone}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function module(
  title: string,
  description: string,
  href: string,
  icon: ComponentType<{ className?: string }>,
  tone: string,
): Module {
  return { title, description, href, icon, tone };
}
