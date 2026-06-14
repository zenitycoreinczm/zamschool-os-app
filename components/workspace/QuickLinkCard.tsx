import Link from "next/link";
import { ChevronRight, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";

import type { HeroAccent } from "@/components/workspace/heroAccents";
import { moduleToneClass } from "@/components/workspace/heroAccents";
import { cn } from "@/lib/utils";

type QuickLinkCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<LucideProps>;
  accent?: HeroAccent;
};

export function QuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
  accent = "sky",
}: QuickLinkCardProps) {
  const tone =
    accent === "slate"
      ? "slate"
      : accent === "teal"
        ? "teal"
        : accent === "indigo"
          ? "indigo"
          : accent === "emerald"
            ? "emerald"
            : accent === "amber"
              ? "amber"
              : accent === "violet"
                ? "violet"
                : accent === "rose"
                  ? "rose"
                  : "sky";

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-workspace-xl border border-workspace-border bg-white p-5 shadow-workspace-sm",
        "transition duration-[var(--duration-workspace-normal)] ease-[var(--ease-workspace-out)]",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-workspace-md focus-visible:shadow-workspace-focus"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid h-12 w-12 place-items-center rounded-workspace-lg ring-1 transition",
            moduleToneClass(tone)
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-semibold tracking-tight text-slate-900">{title}</p>
          <p className="text-sm text-workspace-muted">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
    </Link>
  );
}