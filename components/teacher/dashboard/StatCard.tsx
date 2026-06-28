const statTone = {
  sky: "bg-sky-50 text-sky-600 ring-sky-200",
  violet: "bg-violet-50 text-violet-600 ring-violet-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  rose: "bg-rose-50 text-rose-600 ring-rose-200",
} as const;

export type StatTone = keyof typeof statTone;

import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: StatTone;
  href?: string;
}) {
  const body = (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
          statTone[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="ws-tabular text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
  if (href) {
    return <Link href={href}>{body}</Link>;
  }
  return body;
}
