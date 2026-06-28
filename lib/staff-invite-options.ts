import { getRoleDisplayLabel } from "./roles.ts";

export const SCHOOL_ADMINISTRATOR_INVITE_ROLE = "admin" as const;

export type StaffInviteRoleValue =
  | typeof SCHOOL_ADMINISTRATOR_INVITE_ROLE
  | "deputy_head"
  | "bursar"
  | "payments"
  | "guidance_office"
  | "academic_admin"
  | "hr_admin"
  | "ict_admin"
  | "discipline_admin"
  | "registrar"
  | "teacher";

export type StaffInviteRoleOption = {
  value: StaffInviteRoleValue;
  label: string;
  hint: string;
};

export const STAFF_INVITE_ROLE_OPTIONS: StaffInviteRoleOption[] = [
  {
    value: SCHOOL_ADMINISTRATOR_INVITE_ROLE,
    label: getRoleDisplayLabel("admin"),
    hint: "Office operations, user management, and the school administrator dashboard.",
  },
  {
    value: "deputy_head",
    label: getRoleDisplayLabel("deputy_head"),
    hint: "Deputy head operations hub, classes, attendance, and timetables.",
  },
  {
    value: "bursar",
    label: getRoleDisplayLabel("bursar"),
    hint: "Finance hub, fees, and payment oversight.",
  },
  {
    value: "hr_admin",
    label: getRoleDisplayLabel("hr_admin"),
    hint: "Staff records, invitations, and HR workflows.",
  },
  {
    value: "academic_admin",
    label: getRoleDisplayLabel("academic_admin"),
    hint: "Academic planning, classes, and curriculum oversight.",
  },
  {
    value: "ict_admin",
    label: getRoleDisplayLabel("ict_admin"),
    hint: "ICT systems, accounts, and technical administration.",
  },
  {
    value: "discipline_admin",
    label: getRoleDisplayLabel("discipline_admin"),
    hint: "Discipline records and student conduct workflows.",
  },
  {
    value: "registrar",
    label: getRoleDisplayLabel("registrar"),
    hint: "Student admissions, parent registration, and transfers.",
  },
  {
    value: "guidance_office",
    label: getRoleDisplayLabel("guidance_office"),
    hint: "Student welfare, guidance, and counselling support.",
  },
  {
    value: "payments",
    label: getRoleDisplayLabel("payments"),
    hint: "Payment collection and student fee accounts.",
  },
  {
    value: "teacher",
    label: getRoleDisplayLabel("teacher"),
    hint: "Classroom teaching workspace. Prefer Users → Teachers for full class setup.",
  },
];

/**
 * Role options for the Head Teacher (principal) staff invitation page.
 * Excludes teacher, student, and parent — those are managed via
 * the Users section or the registrar/teacher workflows.
 */
export const PRINCIPAL_STAFF_INVITE_ROLE_OPTIONS: StaffInviteRoleOption[] =
  STAFF_INVITE_ROLE_OPTIONS.filter((option) => option.value !== "teacher");

export function getStaffInviteRoleLabel(
  role: string | null | undefined,
): string {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  const match = STAFF_INVITE_ROLE_OPTIONS.find(
    (option) => option.value === normalized,
  );
  return match?.label || getRoleDisplayLabel(role);
}
