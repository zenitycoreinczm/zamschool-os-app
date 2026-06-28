/**
 * ZamSchool OS — Zambian Localization & Data Validation Module
 * Standardizes currency, phone formatting (+260), and ECZ grading structures.
 */

// ─── Phone Number Validation & Normalization (+260) ──────────────────────────

/**
 * Validates whether a given string is a valid Zambian phone number.
 * Supports Airtel (+26097/097/077), MTN (+26096/096/076), Zamtel (+26095/095/075).
 */
export function isValidZambianPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Matches +2609X..., +2607X..., 09X..., 07X..., 9X..., 7X...
  return /^(?:\+?260|0)?(?:9[567]|7[567])\d{7}$/.test(cleaned);
}

/**
 * Normalizes any valid Zambian phone input into canonical international format: +260XXXXXXXXX
 */
export function normalizeZambianPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  const match = cleaned.match(/^(?:\+?260|0)?((?:9[567]|7[567])\d{7})$/);
  if (!match) return null;
  return `+260${match[1]}`;
}

// ─── Currency Formatting (ZMW / Kwacha) ──────────────────────────────────────

/**
 * Formats a numeric amount as Zambian Kwacha (ZMW).
 * Example: 1500.5 -> "ZMW 1,500.50"
 */
export function formatKwacha(amount: number | null | undefined, options?: { symbol?: "ZMW" | "K" }): string {
  const value = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const prefix = options?.symbol === "K" ? "K" : "ZMW ";
  const formatted = value.toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${prefix}${formatted}`;
}

// ─── ECZ (Examinations Council of Zambia) Grading Standard ───────────────────

export type ECZGrade = {
  grade: string;
  label: string;
  points: number;
  minMark: number;
  maxMark: number;
};

export const ECZ_GRADE_SCALE: ECZGrade[] = [
  { grade: "One", label: "Distinction", points: 1, minMark: 75, maxMark: 100 },
  { grade: "Two", label: "Distinction", points: 2, minMark: 70, maxMark: 74 },
  { grade: "Three", label: "Merit", points: 3, minMark: 65, maxMark: 69 },
  { grade: "Four", label: "Merit", points: 4, minMark: 60, maxMark: 64 },
  { grade: "Five", label: "Credit", points: 5, minMark: 55, maxMark: 59 },
  { grade: "Six", label: "Credit", points: 6, minMark: 50, maxMark: 54 },
  { grade: "Seven", label: "Satisfactory", points: 7, minMark: 45, maxMark: 49 },
  { grade: "Eight", label: "Satisfactory", points: 8, minMark: 40, maxMark: 44 },
  { grade: "Nine", label: "Unsatisfactory", points: 9, minMark: 0, maxMark: 39 },
];

/**
 * Resolves an exam mark (0-100) to its corresponding ECZ Grade & classification.
 */
export function getECZGrade(mark: number): ECZGrade {
  const clamped = Math.max(0, Math.min(100, Math.round(mark)));
  return (
    ECZ_GRADE_SCALE.find((g) => clamped >= g.minMark && clamped <= g.maxMark) || {
      grade: "Nine",
      label: "Unsatisfactory",
      points: 9,
      minMark: 0,
      maxMark: 39,
    }
  );
}
