export type HeroAccent = "sky" | "teal" | "indigo" | "amber" | "emerald" | "violet" | "rose" | "slate" | "green";

export const heroAccentStyles: Record<
  HeroAccent,
  {
    shell: string;
    eyebrow: string;
    glowA: string;
    glowB: string;
    statBorder: string;
  }
> = {
  sky: {
    shell: "from-slate-950 via-slate-900 to-sky-950",
    eyebrow: "text-sky-300",
    glowA: "bg-sky-500/25",
    glowB: "bg-cyan-400/15",
    statBorder: "border-white/10",
  },
  teal: {
    shell: "from-slate-950 via-teal-950 to-emerald-950",
    eyebrow: "text-teal-300",
    glowA: "bg-teal-500/30",
    glowB: "bg-emerald-400/15",
    statBorder: "border-white/10",
  },
  indigo: {
    shell: "from-slate-950 via-indigo-950 to-violet-950",
    eyebrow: "text-indigo-300",
    glowA: "bg-indigo-500/30",
    glowB: "bg-violet-400/15",
    statBorder: "border-white/10",
  },
  amber: {
    shell: "from-slate-950 via-amber-950 to-orange-950",
    eyebrow: "text-amber-300",
    glowA: "bg-amber-500/25",
    glowB: "bg-orange-400/15",
    statBorder: "border-white/10",
  },
  emerald: {
    shell: "from-slate-950 via-emerald-950 to-teal-950",
    eyebrow: "text-emerald-300",
    glowA: "bg-emerald-500/25",
    glowB: "bg-teal-400/15",
    statBorder: "border-white/10",
  },
  violet: {
    shell: "from-slate-950 via-violet-950 to-fuchsia-950",
    eyebrow: "text-violet-300",
    glowA: "bg-violet-500/25",
    glowB: "bg-fuchsia-400/15",
    statBorder: "border-white/10",
  },
  rose: {
    shell: "from-slate-950 via-rose-950 to-pink-950",
    eyebrow: "text-rose-300",
    glowA: "bg-rose-500/25",
    glowB: "bg-pink-400/15",
    statBorder: "border-white/10",
  },
  slate: {
    shell: "from-slate-950 via-slate-900 to-slate-800",
    eyebrow: "text-slate-300",
    glowA: "bg-slate-500/20",
    glowB: "bg-slate-400/10",
    statBorder: "border-white/10",
  },
  green: {
    shell: "from-slate-950 via-green-950 to-emerald-950",
    eyebrow: "text-green-300",
    glowA: "bg-green-500/25",
    glowB: "bg-emerald-400/15",
    statBorder: "border-white/10",
  },
};

export const pageHeaderAccentStyles: Record<
  HeroAccent,
  { bar: string; eyebrow: string; surface: string; icon: string }
> = {
  sky: {
    bar: "from-sky-500 to-cyan-400",
    eyebrow: "text-sky-600",
    surface: "from-white via-white to-sky-50/80",
    icon: "bg-sky-50 text-sky-600 ring-sky-100",
  },
  teal: {
    bar: "from-teal-500 to-emerald-400",
    eyebrow: "text-teal-600",
    surface: "from-white via-white to-teal-50/80",
    icon: "bg-teal-50 text-teal-600 ring-teal-100",
  },
  indigo: {
    bar: "from-indigo-500 to-violet-400",
    eyebrow: "text-indigo-600",
    surface: "from-white via-white to-indigo-50/80",
    icon: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  amber: {
    bar: "from-amber-500 to-orange-400",
    eyebrow: "text-amber-700",
    surface: "from-white via-white to-amber-50/80",
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  emerald: {
    bar: "from-emerald-500 to-teal-400",
    eyebrow: "text-emerald-600",
    surface: "from-white via-white to-emerald-50/80",
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  violet: {
    bar: "from-violet-500 to-fuchsia-400",
    eyebrow: "text-violet-600",
    surface: "from-white via-white to-violet-50/80",
    icon: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  rose: {
    bar: "from-rose-500 to-pink-400",
    eyebrow: "text-rose-600",
    surface: "from-white via-white to-rose-50/80",
    icon: "bg-rose-50 text-rose-600 ring-rose-100",
  },
  slate: {
    bar: "from-slate-600 to-slate-400",
    eyebrow: "text-slate-600",
    surface: "from-white via-white to-slate-50",
    icon: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  green: {
    bar: "from-green-500 to-emerald-400",
    eyebrow: "text-green-600",
    surface: "from-white via-white to-green-50/80",
    icon: "bg-green-50 text-green-600 ring-green-100",
  },
};

export function moduleToneClass(tone: string) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-50 text-emerald-600 ring-emerald-100 group-hover:bg-emerald-100";
    case "indigo":
      return "bg-indigo-50 text-indigo-600 ring-indigo-100 group-hover:bg-indigo-100";
    case "amber":
      return "bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-100";
    case "rose":
      return "bg-rose-50 text-rose-600 ring-rose-100 group-hover:bg-rose-100";
    case "violet":
      return "bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100";
    case "teal":
      return "bg-teal-50 text-teal-600 ring-teal-100 group-hover:bg-teal-100";
    case "slate":
      return "bg-slate-100 text-slate-600 ring-slate-200 group-hover:bg-slate-200";
    case "green":
      return "bg-green-50 text-green-600 ring-green-100 group-hover:bg-green-100";
    default:
      return "bg-sky-50 text-sky-600 ring-sky-100 group-hover:bg-sky-100";
  }
}
