import { normalizeRole, roleToStoredValue } from "./roles.ts";

/** Roles that must never be created from the school UI. */
const BLOCKED_TARGET_ROLES = new Set(["principal", "super_admin"]);

/**
 * Head Teacher (principal) and School Administrator can provision every school role
 * except Head Teacher / platform super admin.
 */
export function canActorCreateSchoolRole(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean {
  const actor = normalizeRole(actorRole);
  const target = roleToStoredValue(targetRole);
  if (!actor || !target || BLOCKED_TARGET_ROLES.has(target)) {
    return false;
  }

  if (actor === "PRINCIPAL" || actor === "SUPER_ADMIN" || actor === "ADMIN") {
    return true;
  }

  if (actor === "HR_ADMIN") {
    return target !== "student" && target !== "parent";
  }

  return false;
}

export function blockedRoleCreationMessage(targetRole: string | null | undefined): string {
  const target = roleToStoredValue(targetRole);
  if (target === "principal") {
    return "Head Teacher accounts are created only when the school is registered.";
  }
  if (target === "super_admin") {
    return "Platform super admin accounts cannot be created from a school workspace.";
  }
  return "You do not have permission to create this account type.";
}