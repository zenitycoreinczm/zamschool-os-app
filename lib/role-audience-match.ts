import { parseTargetAudience } from "./target-audience.ts";
import { normalizeRole, roleToStoredValue } from "./roles.ts";

/** Stored profile role used for audience matching (e.g. principal, admin). */
export function resolveStoredRole(role: string | null | undefined): string | null {
  return roleToStoredValue(role) || String(role || "").trim().toLowerCase() || null;
}

/**
 * Whether content targeted at `targetRole` should be visible to the viewer.
 * Head Teacher (principal) and School Administrator (admin) are distinct unless
 * the target explicitly uses a combined leadership audience.
 */
export function matchesRoleTarget(
  targetRole: string | null | undefined,
  viewerRole: string | null | undefined,
  options?: { viewerClassId?: string | null }
): boolean {
  const rawTarget = String(targetRole || "").trim();
  if (!rawTarget || rawTarget === "all" || rawTarget === "general") {
    return true;
  }

  const parsed = parseTargetAudience(rawTarget);
  if (parsed.targetClassId) {
    const viewerClass = String(options?.viewerClassId || "").trim();
    return Boolean(viewerClass && viewerClass === parsed.targetClassId);
  }

  const target = parsed.targetRole || parsed.audience;
  const viewer = resolveStoredRole(viewerRole);
  if (!viewer) {
    return false;
  }

  const targetStored = roleToStoredValue(target) || target;

  if (targetStored === viewer) {
    return true;
  }

  const leadershipTargets = new Set([
    "leadership",
    "school_leadership",
    "school_leadership_team",
    "head_teacher_authority",
  ]);

  if (leadershipTargets.has(targetStored) && (viewer === "principal" || viewer === "admin")) {
    return true;
  }

  const targetCanonical = normalizeRole(target);
  const viewerCanonical = normalizeRole(viewer);
  if (targetCanonical && viewerCanonical && targetCanonical === viewerCanonical) {
    return true;
  }

  return false;
}