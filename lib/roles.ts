export const KNOWN_ROLES = [
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "PAYMENTS",
  "PRINCIPAL",
  "DEPUTY_HEAD",
  "BURSAR",
  "GUIDANCE_OFFICE",
  "ACADEMIC_ADMIN",
  "HR_ADMIN",
  "ICT_ADMIN",
  "DISCIPLINE_ADMIN",
  "REGISTRAR",
  "SUPER_ADMIN",
] as const;

export type KnownRole = (typeof KNOWN_ROLES)[number];

const ROLE_ALIASES: Record<string, KnownRole> = {
  ADMINISTRATOR: "ADMIN",
  HEAD_TEACHER: "PRINCIPAL",
  HEADTEACHER: "PRINCIPAL",
  PRINCIPAL: "PRINCIPAL",
  DEPUTY_HEAD_TEACHER: "DEPUTY_HEAD",
  DEPUTY_HEADTEACHER: "DEPUTY_HEAD",
  DEPUTY_HEAD: "DEPUTY_HEAD",
  FINANCE_OFFICER: "BURSAR",
  FINANCE: "BURSAR",
  GUIDANCE_OFFICER: "GUIDANCE_OFFICE",
  GUIDANCE: "GUIDANCE_OFFICE",
  IT_ADMIN: "ICT_ADMIN",
  IT_ADMINISTRATOR: "ICT_ADMIN",
  ICT_ADMINISTRATOR: "ICT_ADMIN",
  ADMISSIONS_OFFICER: "REGISTRAR",
  ADMISSIONS: "REGISTRAR",
  SCHOOL_SECRETARY: "REGISTRAR",
  REGISTRAR: "REGISTRAR",
};

const STORED_ROLE_VALUES: Record<KnownRole, string> = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
  PAYMENTS: "payments",
  PRINCIPAL: "principal",
  DEPUTY_HEAD: "deputy_head",
  BURSAR: "bursar",
  GUIDANCE_OFFICE: "guidance_office",
  ACADEMIC_ADMIN: "academic_admin",
  HR_ADMIN: "hr_admin",
  ICT_ADMIN: "ict_admin",
  DISCIPLINE_ADMIN: "discipline_admin",
  REGISTRAR: "registrar",
  SUPER_ADMIN: "super_admin",
};

export function normalizeRole(
  role: string | null | undefined,
): KnownRole | null {
  const normalized = String(role || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  if (!normalized) return null;
  if (KNOWN_ROLES.includes(normalized as KnownRole))
    return normalized as KnownRole;
  return ROLE_ALIASES[normalized] || null;
}

export function roleToStoredValue(
  role: string | null | undefined,
): string | null {
  const normalized = normalizeRole(role);
  return normalized ? STORED_ROLE_VALUES[normalized] : null;
}

export function roleDatabaseValues(role: string | null | undefined): string[] {
  const normalized = normalizeRole(role);
  if (!normalized) return [];

  const stored = STORED_ROLE_VALUES[normalized];
  const values = new Set<string>([
    stored,
    normalized,
    normalized.toLowerCase(),
  ]);

  for (const [alias, canonical] of Object.entries(ROLE_ALIASES)) {
    if (canonical === normalized) {
      values.add(alias);
      values.add(alias.toLowerCase());
    }
  }

  return Array.from(values);
}

export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return Boolean(
    normalized &&
    [
      "ADMIN",
      "PRINCIPAL",
      "SUPER_ADMIN",
      "DEPUTY_HEAD",
      "ACADEMIC_ADMIN",
      "HR_ADMIN",
      "ICT_ADMIN",
    ].includes(normalized),
  );
}

export function isSensitiveRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return Boolean(
    normalized &&
    ["SUPER_ADMIN", "PRINCIPAL", "BURSAR", "ICT_ADMIN"].includes(normalized),
  );
}

export function isFinancialRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return Boolean(normalized && ["BURSAR", "PAYMENTS"].includes(normalized));
}

/** Human-readable labels for stored profile roles (Zambia school terminology). */
export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  admin: "School Administrator",
  principal: "Head Teacher",
  deputy_head: "Deputy Head Teacher",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent / Guardian",
  payments: "Payments Officer",
  bursar: "Bursar",
  guidance_office: "Guidance Office",
  academic_admin: "Academic Administrator",
  hr_admin: "HR Administrator",
  ict_admin: "ICT Administrator",
  discipline_admin: "Discipline Administrator",
  registrar: "Registrar / Admissions",
  super_admin: "Platform Super Admin",
};

export function getRoleDisplayLabel(role: string | null | undefined): string {
  const stored = roleToStoredValue(role);
  if (stored && ROLE_DISPLAY_LABELS[stored]) return ROLE_DISPLAY_LABELS[stored];

  const raw = String(role || "")
    .trim()
    .toLowerCase();
  if (raw && ROLE_DISPLAY_LABELS[raw]) return ROLE_DISPLAY_LABELS[raw];

  const normalized = normalizeRole(role);
  if (normalized) {
    const fromCanonical = roleToStoredValue(normalized);
    if (fromCanonical && ROLE_DISPLAY_LABELS[fromCanonical]) {
      return ROLE_DISPLAY_LABELS[fromCanonical];
    }
  }

  if (!raw) return "Account";
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isPrincipalRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "PRINCIPAL";
}

export function isSchoolAdministratorRole(
  role: string | null | undefined,
): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function isPlatformSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return normalizeRole(role) === "SUPER_ADMIN";
}
