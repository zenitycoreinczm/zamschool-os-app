import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HeroAccent } from "@/components/workspace/heroAccents";

type PageLoadingProps = {
  label?: string;
  accent?: HeroAccent;
};

const accentClass: Record<HeroAccent, string> = {
  sky: "text-brand",
  teal: "text-teal-600",
  indigo: "text-indigo-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
  violet: "text-violet-600",
  rose: "text-rose-600",
  slate: "text-slate-600",
  green: "text-green-600",
};

export function PageLoading({ label = "Loading", accent = "sky" }: PageLoadingProps) {
  return (
    <div
      className="grid min-h-[40vh] place-items-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className={cn("h-8 w-8 animate-spin", accentClass[accent])} />
        <p className="text-sm font-medium text-workspace-muted">{label}</p>
      </div>
    </div>
  );
}
