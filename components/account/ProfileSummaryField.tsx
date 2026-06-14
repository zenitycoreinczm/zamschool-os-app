"use client";

import type { ComponentType } from "react";

import { Surface } from "@/components/workspace/Surface";
import type { HeroAccent } from "@/components/workspace/heroAccents";
import { cn } from "@/lib/utils";

const accentIconClass: Record<"sky" | "teal" | "indigo", string> = {
  sky: "bg-sky-50 text-sky-700",
  teal: "bg-teal-50 text-teal-700",
  indigo: "bg-indigo-50 text-indigo-700",
};

export function ProfileSummaryField({
  icon: Icon,
  label,
  value,
  accent = "sky",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: HeroAccent;
}) {
  const iconTone =
    accent === "teal" || accent === "indigo" ? accentIconClass[accent] : accentIconClass.sky;

  return (
    <Surface variant="default" className="p-5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-workspace-lg",
            iconTone
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 font-medium text-slate-900">{value}</p>
        </div>
      </div>
    </Surface>
  );
}