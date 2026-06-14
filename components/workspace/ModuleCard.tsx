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
        "group relative overflow-hidden rounded-workspace-xl border border-workspace-border bg-white p-5 shadow-workspace-sm",
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
          "relative mb-4 flex h-11 w-11 items-center justify-center rounded-workspace-lg ring-1 transition",
          moduleToneClass(tone)
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="relative font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-workspace-muted">{description}</p>
      <p className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand group-hover:text-brand-hover">
        Open module
        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </p>
    </Link>
  );
}