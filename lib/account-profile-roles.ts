import type { KnownRole } from "@/lib/roles";

/** Roles that may read/update their own profile and upload an avatar (school-scoped). */
export const ACCOUNT_PROFILE_ROLES = [
  "ADMIN",
  "PRINCIPAL",
  "DEPUTY_HEAD",
  "BURSAR",
  "PAYMENTS",
  "GUIDANCE_OFFICE",
  "ACADEMIC_ADMIN",
  "HR_ADMIN",
  "ICT_ADMIN",
  "DISCIPLINE_ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
] as const satisfies readonly KnownRole[];