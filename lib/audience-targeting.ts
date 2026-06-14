const ROLE_ALIASES: Record<string, "all" | "admin" | "principal" | "leadership" | "teacher" | "student" | "parent"> = {
  all: "all",
  general: "all",
  admin: "admin",
  admins: "admin",
  administrator: "admin",
  school_administrator: "admin",
  principal: "principal",
  head_teacher: "principal",
  headteacher: "principal",
  leadership: "leadership",
  school_leadership: "leadership",
  school_leadership_team: "leadership",
  teacher: "teacher",
  teachers: "teacher",
  student: "student",
  students: "student",
  parent: "parent",
  parents: "parent",
};

export function normalizeTargetRoleForStorage(value: string | null | undefined) {
  const normalized = normalizeRoleKey(value);
  if (!normalized || normalized === "all") {
    return null;
  }

  return normalized;
}

export function normalizeAudienceForStorage(value: string | null | undefined) {
  const normalized = normalizeRoleKey(value);

  switch (normalized) {
    case "teacher":
      return "teachers";
    case "student":
      return "students";
    case "parent":
      return "parents";
    default:
      return "all";
  }
}

export function normalizeTargetRoleForResponse(value: string | null | undefined) {
  const normalized = normalizeRoleKey(value);
  if (!normalized || normalized === "all") {
    return null;
  }

  return normalized.toUpperCase();
}

function normalizeRoleKey(value: string | null | undefined) {
  const key = String(value || "").trim().toLowerCase();
  return ROLE_ALIASES[key] || null;
}
