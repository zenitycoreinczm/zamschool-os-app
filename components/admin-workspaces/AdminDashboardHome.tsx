"use client";

import Link from "next/link";
import { ClipboardCheck, CreditCard, Users } from "lucide-react";

import { AdminPageHero } from "@/components/admin/AdminPageHero";
import SchoolAdminDashboard from "@/components/dashboard/SchoolAdminDashboard";
import { useWorkspaceContext } from "@/components/WorkspaceContextProvider";
import { FocusPills } from "@/components/workspace/FocusPills";
import { metricsToStatCards } from "@/components/workspace/metricIcons";
import { useWorkspaceSummary } from "@/components/workspace/useWorkspaceSummary";

const FALLBACK = [
  { label: "Students", value: "—", icon: Users, tone: "sky" as const },
  { label: "Teachers", value: "—", icon: Users, tone: "violet" as const },
  {
    label: "Attendance",
    value: "—",
    icon: ClipboardCheck,
    tone: "amber" as const,
  },
  {
    label: "Outstanding",
    value: "—",
    icon: CreditCard,
    tone: "emerald" as const,
  },
];

export default function AdminDashboardHome() {
  const { data: workspace } = useWorkspaceContext();
  const { metrics, highlights, loading } = useWorkspaceSummary();

  const schoolName = workspace?.schoolName || "Your school";
  const yearTerm = workspace?.yearTerm || "Academic context";
  const displayName = workspace?.displayName || "Administrator";

  const heroStats = loading
    ? FALLBACK
    : metrics.length > 0
      ? metricsToStatCards(metrics, [Users, Users, ClipboardCheck, CreditCard])
      : FALLBACK;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHero
        eyebrow="School administrator workspace"
        title={schoolName}
        description={`Welcome back, ${displayName}. Operational overview for ${yearTerm}.`}
        accent="emerald"
        stats={heroStats}
        actions={
          <Link
            href="/app/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            <Users className="h-4 w-4 text-emerald-600" />
            Users & accounts
          </Link>
        }
      />

      <FocusPills items={highlights} />

      <SchoolAdminDashboard />
    </div>
  );
}
