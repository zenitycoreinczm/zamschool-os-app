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
  GraduationCap,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { useWorkspaceContext } from "@/components/WorkspaceContextProvider";
import { FocusPills } from "@/components/workspace/FocusPills";
import type { HeroAccent } from "@/components/workspace/heroAccents";
import { metricsToStatCards } from "@/components/workspace/metricIcons";
import { ModuleCard } from "@/components/workspace/ModuleCard";
import { SectionIntro } from "@/components/workspace/SectionIntro";
import { useWorkspaceSummary } from "@/components/workspace/useWorkspaceSummary";

type WorkspaceKey =
  | "deputy_head"
  | "bursar"
  | "guidance_office"
  | "academic_admin"
  | "hr_admin"
  | "ict_admin"
  | "discipline_admin";

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
  fallbackMetrics: { label: string; value: string; icon: ComponentType<{ className?: string }> }[];
  quickLink?: { href: string; label: string; icon: ComponentType<{ className?: string }> };
  metricIcons: ComponentType<{ className?: string }>[];
};

const CONFIG: Record<WorkspaceKey, WorkspaceConfig> = {
  deputy_head: {
    eyebrow: "Deputy Head workspace",
    title: "Academic operations hub",
    summary: "Daily academic operations, attendance supervision, staff follow-up, and operational reporting.",
    focus: ["Coordinate staff", "Track attendance", "Monitor academics", "Escalate issues"],
    accent: "sky",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Classes", value: "—", icon: GraduationCap },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
    ],
    quickLink: { href: "/app/admin/attendance", label: "Review attendance", icon: ClipboardCheck },
    metricIcons: [Users, Users, GraduationCap, ClipboardCheck],
    modules: [
      module("Users & accounts", "Student, parent, and teacher directory.", "/app/admin/users", Users, "emerald"),
      module("Classes", "Class structures and readiness.", "/app/admin/classes", GraduationCap, "sky"),
      module("Attendance", "School attendance activity and follow-up.", "/app/admin/attendance", ClipboardCheck, "indigo"),
      module("Timetable", "Timetable visibility and planning.", "/app/admin/timetable", CalendarClock, "amber"),
      module("Messages", "Communicate with staff and offices.", "/app/messages", MessageSquare, "rose"),
      module("Announcements", "Operational notices.", "/app/announcements", Megaphone, "slate"),
    ],
  },
  bursar: {
    eyebrow: "Bursar workspace",
    title: "Finance control room",
    summary: "Fees, payments, receipts, and financial reporting — without unrelated discipline settings.",
    focus: ["Record payments", "Review balances", "Track fees", "Prepare reports"],
    accent: "amber",
    fallbackMetrics: [
      { label: "Collected", value: "—", icon: CreditCard },
      { label: "Pending", value: "—", icon: CreditCard },
      { label: "Students", value: "—", icon: Users },
      { label: "Alerts", value: "—", icon: Bell },
    ],
    quickLink: { href: "/app/payments/fees", label: "Manage fees", icon: CreditCard },
    metricIcons: [CreditCard, CreditCard, Users, Bell],
    modules: [
      module("Finance records", "Income and expense records.", "/app/admin/finance", FileBarChart2, "amber"),
      module("Fee management", "Fees, billing, and balances.", "/app/payments/fees", CreditCard, "emerald"),
      module("Student accounts", "Payment status by learner.", "/app/payments/students", Users, "sky"),
      module("Payments dashboard", "Focused payments workspace.", "/app/payments", BarChart3, "indigo"),
      module("Notifications", "Fee alerts and reminders.", "/app/notifications", Bell, "rose"),
      module("Messages", "Coordinate with leadership and guardians.", "/app/messages", MessageSquare, "slate"),
    ],
  },
  guidance_office: {
    eyebrow: "Guidance office workspace",
    title: "Student welfare desk",
    summary: "Counseling, welfare follow-up, discipline reporting, and sensitive student communication.",
    focus: ["Protect welfare", "Review behavior", "Coordinate support", "Document concerns"],
    accent: "rose",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
      { label: "Late (7d)", value: "—", icon: AlertTriangle },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: { href: "/app/admin/users", label: "Student directory", icon: Users },
    metricIcons: [Users, ClipboardCheck, AlertTriangle, MessageSquare],
    modules: [
      module("Student directory", "Profiles and guardian context.", "/app/admin/users", Users, "emerald"),
      module("Attendance signals", "Patterns that may need support.", "/app/admin/attendance", ClipboardCheck, "sky"),
      module("Messages", "Private staff and leadership communication.", "/app/messages", MessageSquare, "indigo"),
      module("Announcements", "Welfare and guidance updates.", "/app/announcements", Megaphone, "amber"),
      module("Events", "Counseling sessions and welfare events.", "/app/events", CalendarClock, "rose"),
      module("Notifications", "Student welfare alerts.", "/app/notifications", Bell, "slate"),
    ],
  },
  academic_admin: {
    eyebrow: "Academic admin workspace",
    title: "Academic systems desk",
    summary: "Years, terms, subjects, classes, assignments, grading, and timetables for teachers and learners.",
    focus: ["Structure academics", "Publish grades", "Coordinate timetable", "Support teachers"],
    accent: "violet",
    fallbackMetrics: [
      { label: "Classes", value: "—", icon: GraduationCap },
      { label: "Subjects", value: "—", icon: BookOpen },
      { label: "Assignments", value: "—", icon: BookOpen },
      { label: "Teachers", value: "—", icon: Users },
    ],
    quickLink: { href: "/app/admin/academic", label: "Academic calendar", icon: BookOpen },
    metricIcons: [GraduationCap, BookOpen, BookOpen, Users],
    modules: [
      module("Academic years", "Years and terms.", "/app/admin/academic", BookOpen, "indigo"),
      module("Classes", "Class groups and supervisors.", "/app/admin/classes", GraduationCap, "sky"),
      module("Subjects", "Subject catalog and structure.", "/app/admin/subjects", BookOpen, "emerald"),
      module("Grading scales", "Grading rules and results.", "/app/admin/grading-scales", ClipboardCheck, "amber"),
      module("Assignments", "School assignment setup.", "/app/admin/assignments", ClipboardCheck, "rose"),
      module("Timetable", "Timetable planning.", "/app/admin/timetable", CalendarClock, "slate"),
    ],
  },
  hr_admin: {
    eyebrow: "HR admin workspace",
    title: "Staff administration desk",
    summary: "Staff onboarding, role records, departments, and account readiness.",
    focus: ["Invite staff", "Maintain records", "Review departments", "Support onboarding"],
    accent: "emerald",
    fallbackMetrics: [
      { label: "Staff", value: "—", icon: UserCog },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Invites", value: "—", icon: UserCog },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: { href: "/app/admin/users", label: "Staff directory", icon: Users },
    metricIcons: [UserCog, Users, UserCog, MessageSquare],
    modules: [
      module("Users & accounts", "Create and review staff accounts.", "/app/admin/users", Users, "emerald"),
      module("School departments", "Structure and department assignments.", "/app/admin/school", Building2, "sky"),
      module("Messages", "Onboarding and staff support.", "/app/messages", MessageSquare, "indigo"),
      module("Notifications", "Onboarding and account alerts.", "/app/notifications", Bell, "amber"),
      module("Announcements", "Staff notices.", "/app/announcements", Megaphone, "rose"),
      module("Settings", "Account preferences.", "/app/settings", Settings, "slate"),
    ],
  },
  ict_admin: {
    eyebrow: "ICT admin workspace",
    title: "Technical operations center",
    summary: "Account recovery, session security, and school technical readiness.",
    focus: ["Recover accounts", "Monitor sessions", "Support security", "Review technical risk"],
    accent: "slate",
    fallbackMetrics: [
      { label: "Accounts", value: "—", icon: Settings },
      { label: "Audit (7d)", value: "—", icon: ShieldCheck },
      { label: "Teachers", value: "—", icon: Users },
      { label: "Alerts", value: "—", icon: Bell },
    ],
    quickLink: { href: "/app/admin/audit", label: "Security audit", icon: ShieldCheck },
    metricIcons: [Settings, ShieldCheck, Users, Bell],
    modules: [
      module("Users & accounts", "Account and access recovery.", "/app/admin/users", Users, "emerald"),
      module("Audit trail", "Security-sensitive changes.", "/app/admin/audit", ShieldCheck, "slate"),
      module("Settings", "Technical configuration.", "/app/settings", Settings, "sky"),
      module("Notifications", "System and security alerts.", "/app/notifications", Bell, "amber"),
      module("Messages", "Support with leadership.", "/app/messages", MessageSquare, "indigo"),
      module("School profile", "Technical identity and metadata.", "/app/admin/school", Building2, "rose"),
    ],
  },
  discipline_admin: {
    eyebrow: "Discipline workspace",
    title: "Student conduct desk",
    summary: "Discipline signals, attendance patterns, student records, and leadership communication.",
    focus: ["Review incidents", "Track patterns", "Coordinate follow-up", "Protect records"],
    accent: "rose",
    fallbackMetrics: [
      { label: "Students", value: "—", icon: Users },
      { label: "Absent (7d)", value: "—", icon: ClipboardCheck },
      { label: "Late (7d)", value: "—", icon: AlertTriangle },
      { label: "Inbox", value: "—", icon: MessageSquare },
    ],
    quickLink: { href: "/app/admin/attendance", label: "Attendance signals", icon: ClipboardCheck },
    metricIcons: [Users, ClipboardCheck, AlertTriangle, MessageSquare],
    modules: [
      module("Student directory", "Profiles for follow-up.", "/app/admin/users", Users, "emerald"),
      module("Attendance signals", "Absence and punctuality patterns.", "/app/admin/attendance", ClipboardCheck, "sky"),
      module("Messages", "Discipline follow-up.", "/app/messages", MessageSquare, "indigo"),
      module("Announcements", "Conduct-related notices.", "/app/announcements", Megaphone, "amber"),
      module("Events", "Hearings and interventions.", "/app/events", CalendarClock, "rose"),
      module("Notifications", "Behavior and attendance alerts.", "/app/notifications", Bell, "slate"),
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
  const config = CONFIG[role];
  const { data: workspace } = useWorkspaceContext();
  const { metrics: liveMetrics, highlights, loading: metricsLoading } = useWorkspaceSummary();

  const schoolName = workspace?.schoolName || "Your school";
  const yearTerm = workspace?.yearTerm || "Academic context";
  const displayName = workspace?.displayName || "Your account";

  const heroStats =
    liveMetrics.length > 0
      ? metricsToStatCards(liveMetrics, config.metricIcons)
      : config.fallbackMetrics.map((item, index) => ({
          label: item.label,
          value: item.value,
          hint: undefined,
          icon: item.icon,
          tone: (["sky", "violet", "amber", "emerald"] as const)[index % 4],
        }));

  const focusItems = highlights.length > 0 ? highlights : config.focus;

  const displayStats = metricsLoading
    ? config.fallbackMetrics.map((item, index) => ({
        label: item.label,
        value: "…",
        icon: item.icon,
        tone: (["sky", "violet", "amber", "emerald"] as const)[index % 4],
      }))
    : heroStats;

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

          <FocusPills
            items={focusItems}
            accent={
              config.accent === "teal" || config.accent === "emerald"
                ? "teal"
                : config.accent === "indigo" || config.accent === "violet" || config.accent === "rose"
                  ? "indigo"
                  : "sky"
            }
          />
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
  tone: string
): Module {
  return { title, description, href, icon, tone };
}

