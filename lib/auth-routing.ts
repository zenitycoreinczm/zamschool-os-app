import { normalizeRole } from "./roles.ts";

export const TEACHER_DASHBOARD_PATH = "/teacher";
export const PAYMENTS_DASHBOARD_PATH = "/app/payments";
export const PRINCIPAL_DASHBOARD_PATH = "/app/principal";
export const DEPUTY_HEAD_DASHBOARD_PATH = "/app/deputy-head";
export const BURSAR_DASHBOARD_PATH = "/app/bursar";
export const GUIDANCE_OFFICE_DASHBOARD_PATH = "/app/guidance";
export const ACADEMIC_ADMIN_DASHBOARD_PATH = "/app/academic-admin";
export const HR_ADMIN_DASHBOARD_PATH = "/app/hr-admin";
export const ICT_ADMIN_DASHBOARD_PATH = "/app/ict-admin";
export const DISCIPLINE_ADMIN_DASHBOARD_PATH = "/app/discipline-admin";
export const SUPER_ADMIN_DASHBOARD_PATH = "/app/super-admin";
export const ADMIN_DASHBOARD_PATH = "/app/dashboard";
export const STUDENT_DASHBOARD_PATH = "/student";
export const PARENT_DASHBOARD_PATH = "/parent";

const LEGACY_PROTECTED_PREFIX_REDIRECTS = [
  ["/payments", PAYMENTS_DASHBOARD_PATH],
  ["/dashboard", "/app/dashboard"],
  ["/account", "/app/profile"],
  ["/profile", "/app/profile"],
  ["/settings", "/app/settings"],
] as const;

export function isSharedProtectedPath(pathname: string): boolean {
  const sharedProtectedPrefixes = [
    "/app/profile",
    "/app/settings",
    "/app/messages",
    "/app/announcements",
    "/app/events",
    "/app/notifications",
  ];
  return sharedProtectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function roleToPath(role: string | null | undefined) {
  const normalized = normalizeRole(role) || "TEACHER";
  if (normalized === "ADMIN") return ADMIN_DASHBOARD_PATH;
  if (normalized === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (normalized === "STUDENT") return STUDENT_DASHBOARD_PATH;
  if (normalized === "PARENT") return PARENT_DASHBOARD_PATH;
  if (normalized === "PAYMENTS") return PAYMENTS_DASHBOARD_PATH;
  if (normalized === "PRINCIPAL") return PRINCIPAL_DASHBOARD_PATH;
  if (normalized === "DEPUTY_HEAD") return DEPUTY_HEAD_DASHBOARD_PATH;
  if (normalized === "BURSAR") return BURSAR_DASHBOARD_PATH;
  if (normalized === "GUIDANCE_OFFICE") return GUIDANCE_OFFICE_DASHBOARD_PATH;
  if (normalized === "ACADEMIC_ADMIN") return ACADEMIC_ADMIN_DASHBOARD_PATH;
  if (normalized === "HR_ADMIN") return HR_ADMIN_DASHBOARD_PATH;
  if (normalized === "ICT_ADMIN") return ICT_ADMIN_DASHBOARD_PATH;
  if (normalized === "DISCIPLINE_ADMIN") return DISCIPLINE_ADMIN_DASHBOARD_PATH;
  if (normalized === "SUPER_ADMIN") return SUPER_ADMIN_DASHBOARD_PATH;
  return ADMIN_DASHBOARD_PATH;
}

function isSafeRedirect(
  redirectTo: string | null | undefined,
): redirectTo is string {
  return typeof redirectTo === "string" && redirectTo.startsWith("/");
}

function mapTeacherSharedPath(pathname: string): string {
  if (pathname === "/app/profile") return "/teacher/profile";
  if (pathname.startsWith("/app/profile/")) {
    return pathname.replace("/app/profile", "/teacher/profile");
  }
  if (pathname === "/app/settings") return "/teacher/settings";
  if (pathname.startsWith("/app/settings/")) {
    return pathname.replace("/app/settings", "/teacher/settings");
  }
  return pathname;
}

function mapStudentSharedPath(pathname: string): string {
  if (pathname === "/app/profile") return "/student/profile";
  if (pathname.startsWith("/app/profile/")) {
    return pathname.replace("/app/profile", "/student/profile");
  }
  if (pathname === "/app/settings") return "/student/settings";
  if (pathname.startsWith("/app/settings/")) {
    return pathname.replace("/app/settings", "/student/settings");
  }
  if (pathname === "/app/messages") return "/student/messages";
  if (pathname === "/app/notifications") return "/student/notifications";
  if (pathname === "/app/announcements") return "/student/announcements";
  return pathname;
}

function mapParentSharedPath(pathname: string): string {
  if (pathname === "/app/profile") return "/parent/profile";
  if (pathname.startsWith("/app/profile/")) {
    return pathname.replace("/app/profile", "/parent/profile");
  }
  if (pathname === "/app/settings") return "/parent/settings";
  if (pathname.startsWith("/app/settings/")) {
    return pathname.replace("/app/settings", "/parent/settings");
  }
  if (pathname === "/app/messages") return "/parent/messages";
  if (pathname === "/app/notifications") return "/parent/notifications";
  if (pathname === "/app/announcements") return "/parent/announcements";
  return pathname;
}

export function normalizeLegacyDashboardPath(pathname: string): string {
  for (const [
    legacyPrefix,
    canonicalPrefix,
  ] of LEGACY_PROTECTED_PREFIX_REDIRECTS) {
    if (pathname === legacyPrefix) return canonicalPrefix;
    if (pathname.startsWith(`${legacyPrefix}/`)) {
      return pathname.replace(legacyPrefix, canonicalPrefix);
    }
  }
  return pathname;
}

export function resolveRoleAwareProtectedPath(
  role: string | null | undefined,
  pathname: string,
): string {
  const normalized = normalizeRole(role);
  if (normalized === "TEACHER") {
    if (pathname === "/app/teacher") return TEACHER_DASHBOARD_PATH;
    if (pathname.startsWith("/app/teacher/")) {
      return pathname.replace("/app/teacher", TEACHER_DASHBOARD_PATH);
    }
    return mapTeacherSharedPath(pathname);
  }
  if (normalized === "STUDENT") {
    return mapStudentSharedPath(pathname);
  }
  if (normalized === "PARENT") {
    return mapParentSharedPath(pathname);
  }
  return pathname;
}

export function resolveProtectedRolePrefix(
  role: string | null | undefined,
): string {
  const normalized = normalizeRole(role);
  if (!normalized) return "";
  if (normalized === "ADMIN") return "/app";
  if (normalized === "TEACHER") return "/teacher";
  if (normalized === "STUDENT") return "/student";
  if (normalized === "PARENT") return "/parent";
  if (normalized === "PAYMENTS") return "/app/payments";
  if (normalized === "PRINCIPAL") return "/app/principal";
  if (normalized === "DEPUTY_HEAD") return "/app/deputy-head";
  if (normalized === "BURSAR") return "/app/bursar";
  if (normalized === "GUIDANCE_OFFICE") return "/app/guidance";
  if (normalized === "ACADEMIC_ADMIN") return "/app/academic-admin";
  if (normalized === "HR_ADMIN") return "/app/hr-admin";
  if (normalized === "ICT_ADMIN") return "/app/ict-admin";
  if (normalized === "DISCIPLINE_ADMIN") return "/app/discipline-admin";
  if (normalized === "SUPER_ADMIN") return "/app/super-admin";
  return "/app";
}

export function resolvePostLoginPath(
  role: string | null | undefined,
  redirectTo?: string | null,
): string {
  const normalized = normalizeRole(role);
  if (!normalized) return "/login?error=profile_not_found";

  const fallbackPath = roleToPath(normalized);
  if (!isSafeRedirect(redirectTo)) return fallbackPath;

  const normalizedRedirect = resolveRoleAwareProtectedPath(
    normalized,
    normalizeLegacyDashboardPath(redirectTo),
  );
  if (isSharedProtectedPath(normalizedRedirect)) return normalizedRedirect;

  if (normalized === "PRINCIPAL") {
    if (normalizedRedirect === ADMIN_DASHBOARD_PATH) {
      return PRINCIPAL_DASHBOARD_PATH;
    }
    if (
      normalizedRedirect === PRINCIPAL_DASHBOARD_PATH ||
      normalizedRedirect.startsWith(`${PRINCIPAL_DASHBOARD_PATH}/`) ||
      normalizedRedirect.startsWith("/app/admin")
    ) {
      return normalizedRedirect;
    }
    return fallbackPath;
  }

  if (normalized === "ADMIN") {
    if (
      normalizedRedirect === PRINCIPAL_DASHBOARD_PATH ||
      normalizedRedirect.startsWith(`${PRINCIPAL_DASHBOARD_PATH}/`)
    ) {
      return ADMIN_DASHBOARD_PATH;
    }
    if (
      normalizedRedirect === ADMIN_DASHBOARD_PATH ||
      normalizedRedirect.startsWith(`${ADMIN_DASHBOARD_PATH}/`) ||
      normalizedRedirect.startsWith("/app/admin") ||
      normalizedRedirect.startsWith("/admin") ||
      (normalizedRedirect.startsWith("/app/") &&
        !normalizedRedirect.startsWith("/app/principal"))
    ) {
      return normalizedRedirect;
    }
    return fallbackPath;
  }

  const protectedPrefix = resolveProtectedRolePrefix(normalized);
  if (
    protectedPrefix &&
    (normalizedRedirect === protectedPrefix ||
      normalizedRedirect.startsWith(`${protectedPrefix}/`))
  ) {
    return normalizedRedirect;
  }

  return fallbackPath;
}

export function resolvePostRegistrationPath(
  role: string | null | undefined,
): string {
  return resolvePostLoginPath(role);
}

export function resolveOnboardingPath({
  role,
  emailVerified,
  hasSchool,
  mustChangePassword,
  redirectTo,
}: {
  role: string | null | undefined;
  emailVerified: boolean;
  hasSchool: boolean;
  mustChangePassword?: boolean;
  redirectTo?: string | null;
}): string {
  const normalized = normalizeRole(role);

  if (!emailVerified) return "/verify-email";
  if (mustChangePassword) return "/first-login";
  if ((normalized === "ADMIN" || normalized === "PRINCIPAL") && !hasSchool)
    return "/app/admin/school";

  return resolvePostLoginPath(normalized, redirectTo);
}

export function resolveAppWorkspaceHome(
  role: string | null | undefined,
): string {
  const normalized = normalizeRole(role);
  if (normalized === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (normalized === "STUDENT") return STUDENT_DASHBOARD_PATH;
  if (normalized === "PARENT") return PARENT_DASHBOARD_PATH;
  if (normalized === "PAYMENTS") return PAYMENTS_DASHBOARD_PATH;
  if (normalized === "PRINCIPAL") return PRINCIPAL_DASHBOARD_PATH;
  if (normalized === "DEPUTY_HEAD") return DEPUTY_HEAD_DASHBOARD_PATH;
  if (normalized === "BURSAR") return BURSAR_DASHBOARD_PATH;
  if (normalized === "GUIDANCE_OFFICE") return GUIDANCE_OFFICE_DASHBOARD_PATH;
  if (normalized === "ACADEMIC_ADMIN") return ACADEMIC_ADMIN_DASHBOARD_PATH;
  if (normalized === "HR_ADMIN") return HR_ADMIN_DASHBOARD_PATH;
  if (normalized === "ICT_ADMIN") return ICT_ADMIN_DASHBOARD_PATH;
  if (normalized === "DISCIPLINE_ADMIN") return DISCIPLINE_ADMIN_DASHBOARD_PATH;
  if (normalized === "SUPER_ADMIN") return SUPER_ADMIN_DASHBOARD_PATH;
  return ADMIN_DASHBOARD_PATH;
}
