import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

import { AdminPageHero, type AdminStatCard } from "@/components/admin/AdminPageHero";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Surface } from "@/components/workspace/Surface";
import { cn } from "@/lib/utils";

export function TeacherHero({
  eyebrow,
  title,
  description,
  stats,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats?: AdminStatCard[];
  actions?: ReactNode;
}) {
  return (
    <AdminPageHero
      eyebrow={eyebrow}
      title={title}
      description={description}
      stats={stats}
      actions={actions}
      accent="amber"
    />
  );
}

export function TeacherPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ComponentType<LucideProps>;
  actions?: ReactNode;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      accent="amber"
    />
  );
}

export function TeacherCard({
  children,
  className,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <Surface
      variant={elevated ? "elevated" : "default"}
      className={cn("p-4 md:p-5", className)}
    >
      {children}
    </Surface>
  );
}

export function TeacherStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <TeacherCard>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-workspace-md bg-amber-50 text-amber-700 ring-1 ring-amber-100">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="ws-tabular text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-workspace-muted">{hint}</p> : null}
    </TeacherCard>
  );
}

export function TeacherEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Surface variant="dashed" className="grid place-items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-workspace-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-workspace-muted">{description}</p>
    </Surface>
  );
}

export const teacherInputClass =
  "w-full rounded-workspace-lg border border-workspace-border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-workspace-xs outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100";

export const teacherPillClass =
  "rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-workspace-xs";
