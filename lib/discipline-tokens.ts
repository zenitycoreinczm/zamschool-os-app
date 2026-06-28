/**
 * Canonical discipline severity and status tokens.
 * Each page derives its specific format (color vs className) from these base values.
 */

export const SEVERITY_LEVELS: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "bg-blue-100 text-blue-700" },
  2: { label: "Minor", color: "bg-yellow-100 text-yellow-700" },
  3: { label: "Moderate", color: "bg-orange-100 text-orange-700" },
  4: { label: "Serious", color: "bg-red-100 text-red-700" },
  5: { label: "Critical", color: "bg-rose-100 text-rose-700" },
};

export const SEVERITY_LEVELS_BORDERED: Record<
  number,
  { label: string; className: string }
> = {
  1: { label: "Low", className: "border-slate-200 bg-slate-50 text-slate-600" },
  2: { label: "Minor", className: "border-amber-200 bg-amber-50 text-amber-700" },
  3: { label: "Moderate", className: "border-orange-200 bg-orange-50 text-orange-700" },
  4: { label: "Serious", className: "border-rose-200 bg-rose-50 text-rose-700" },
  5: { label: "Critical", className: "border-red-200 bg-red-50 text-red-700" },
};

export const DISCIPLINE_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-amber-100 text-amber-700" },
  investigating: { label: "Investigating", color: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700" },
  escalated: { label: "Escalated", color: "bg-red-100 text-red-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-600" },
};

export const DISCIPLINE_STATUS_BORDERED: Record<
  string,
  { label: string; className: string }
> = {
  open: { label: "Open", className: "border-amber-200 bg-amber-50 text-amber-700" },
  investigating: { label: "Investigating", className: "border-sky-200 bg-sky-50 text-sky-700" },
  resolved: { label: "Resolved", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  escalated: { label: "Escalated", className: "border-rose-200 bg-rose-50 text-rose-700" },
  closed: { label: "Closed", className: "border-slate-200 bg-slate-50 text-slate-600" },
};
