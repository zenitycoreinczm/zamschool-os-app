/**
 * Canonical announcement audience encoding (charter Section 5–7).
 * Values: all, principal, admin, leadership, teacher, student, parent, class:{uuid}
 */

export function encodeTargetAudience(input: {
  targetRole?: string | null;
  targetClassId?: string | null;
}): string {
  const classId = String(input.targetClassId || "").trim();
  if (classId) {
    return `class:${classId}`;
  }

  const role = String(input.targetRole || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!role || role === "all" || role === "general") {
    return "all";
  }

  if (role === "leadership" || role === "school_leadership" || role === "school_leadership_team") {
    return "leadership";
  }

  return role;
}

export function parseTargetAudience(value: string | null | undefined): {
  audience: string;
  targetRole: string | null;
  targetClassId: string | null;
} {
  const raw = String(value || "").trim();
  if (!raw || raw === "all" || raw === "general") {
    return { audience: "all", targetRole: null, targetClassId: null };
  }

  if (raw.startsWith("class:")) {
    const classId = raw.slice("class:".length).trim();
    return { audience: raw, targetRole: null, targetClassId: classId || null };
  }

  return { audience: raw, targetRole: raw, targetClassId: null };
}