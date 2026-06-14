import { cn } from "@/lib/utils";

type FocusPillsProps = {
  items: string[];
  accent?: "sky" | "teal" | "indigo" | "slate";
};

const accentRing = {
  sky: "border-workspace-border bg-white/90 text-slate-700 shadow-workspace-xs",
  teal: "border-teal-200/80 bg-teal-50/70 text-teal-900 shadow-workspace-xs",
  indigo: "border-indigo-200/80 bg-indigo-50/70 text-indigo-900 shadow-workspace-xs",
  slate: "border-slate-200/90 bg-slate-50/90 text-slate-700 shadow-workspace-xs",
};

export function FocusPills({ items, accent = "sky" }: FocusPillsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Focus areas">
      {items.map((item) => (
        <span
          key={item}
          role="listitem"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm",
            accentRing[accent]
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}