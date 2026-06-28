import Link from "next/link";
import { ArrowUpRight, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";

import { moduleToneClass } from "@/components/workspace/heroAccents";
import { cn } from "@/lib/utils";

type ModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<LucideProps>;
  tone: string;
};

export function ModuleCard({ title, description, href, icon: Icon, tone }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative grid min-h-[8.5rem] grid-cols-[2.5rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-workspace-xl border border-workspace-border bg-white p-4 shadow-workspace-sm",
        "transition duration-[var(--duration-workspace-normal)] ease-[var(--ease-workspace-out)]",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-workspace-md focus-visible:shadow-workspace-focus"
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-workspace-lg ring-1 transition",
          moduleToneClass(tone)
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="relative min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug tracking-tight text-slate-900">{title}</h3>
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-brand transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-hover" />
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-workspace-muted">{description}</p>
      </div>
    </Link>
  );
}
