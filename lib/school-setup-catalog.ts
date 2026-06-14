export const SCHOOL_SETUP_DEPARTMENT_NAMES = [
  "Administration",
  "Academic",
  "Finance",
  "ICT",
  "Guidance & Counseling",
  "Human Resources",
  "Discipline",
  "Sports & Culture",
] as const;

export const SCHOOL_SETUP_PERMISSION_GROUP_NAMES = [
  "Head Teacher Authority",
  "Academic Management",
  "Finance Access",
  "ICT Administration",
  "HR Management",
  "Guidance Access",
  "Discipline Management",
  "Teaching Access",
] as const;

export const SCHOOL_SETUP_SETTING_KEYS = [
  "academic_year_format",
  "grading_system",
  "attendance_tracking",
  "parent_portal",
  "student_portal",
  "notifications",
  "mfa_required",
  "tenant_isolation",
] as const;

export function computeSchoolSetupProgress(input: {
  departments: number;
  permissionGroups: number;
  settings: number;
}) {
  const targets = {
    departments: SCHOOL_SETUP_DEPARTMENT_NAMES.length,
    permissionGroups: SCHOOL_SETUP_PERMISSION_GROUP_NAMES.length,
    settings: SCHOOL_SETUP_SETTING_KEYS.length,
  };

  const departmentScore = Math.min(input.departments / targets.departments, 1);
  const permissionScore = Math.min(input.permissionGroups / targets.permissionGroups, 1);
  const settingsScore = Math.min(input.settings / targets.settings, 1);
  const percent = Math.round(((departmentScore + permissionScore + settingsScore) / 3) * 100);

  return {
    percent,
    initialized: percent >= 100,
    targets,
  };
}