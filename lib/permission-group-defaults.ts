import { normalizeRole, type KnownRole } from "@/lib/roles";

export type PermissionFeatureSeed = {
  feature_key: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  scope: string;
};

export type PermissionGroupSeed = {
  name: string;
  description: string;
  roles: string[];
  features: PermissionFeatureSeed[];
};

/**
 * Canonical permission group seeds written to permission_groups /
 * permission_group_roles / permission_features during school initialization.
 */
export const DEFAULT_PERMISSION_GROUPS: PermissionGroupSeed[] = [
  {
    name: "Head Teacher Authority",
    description:
      "Full school leadership with override authority. Head Teacher (principal) is the registrant and has final governance authority.",
    roles: ["PRINCIPAL"],
    features: [
      full("users"),
      full("classes"),
      full("subjects"),
      full("attendance", false),
      full("grades"),
      full("settings", false),
      full("announcements"),
      full("messages"),
      full("notifications"),
      full("finance"),
      full("payments"),
      full("audit"),
      full("overrides"),
    ],
  },
  {
    name: "School Administrator",
    description:
      "Day-to-day school operations. School Administrator (admin) manages routine tasks but cannot override published records.",
    roles: ["ADMIN"],
    features: [
      full("users"),
      full("classes"),
      full("subjects"),
      full("attendance", false),
      full("grades"),
      full("settings", false),
      full("announcements"),
      full("messages"),
      full("notifications"),
      full("finance"),
      full("payments"),
      readOnly("audit"),
    ],
  },
  {
    name: "Deputy Head Authority",
    description: "Delegated academic and operational oversight",
    roles: ["DEPUTY_HEAD"],
    features: [
      readOnly("users"),
      writable("classes"),
      writable("subjects"),
      writable("attendance"),
      writable("grades"),
      writable("announcements"),
      writable("messages"),
      writable("notifications"),
    ],
  },
  {
    name: "Finance Office",
    description: "Separated financial access for bursars and payments staff",
    roles: ["BURSAR", "PAYMENTS"],
    features: [writable("finance"), writable("payments"), readOnly("users")],
  },
  {
    name: "Guidance Office",
    description: "Student welfare, discipline, and privacy-focused oversight",
    roles: ["GUIDANCE_OFFICE", "DISCIPLINE_ADMIN"],
    features: [
      readOnly("users"),
      readOnly("attendance"),
      readOnly("grades"),
      writable("discipline"),
      writable("messages"),
    ],
  },
  {
    name: "ICT Administration",
    description: "Technical support, session visibility, and system recovery. No academic data access.",
    roles: ["ICT_ADMIN"],
    features: [writable("users"), writable("settings"), full("sessions"), readOnly("audit")],
  },
  {
    name: "Academic Administration",
    description: "Academic structure, grades, assignments, and timetable support",
    roles: ["ACADEMIC_ADMIN"],
    features: [
      readOnly("users"),
      writable("classes"),
      writable("subjects"),
      readOnly("attendance"),
      writable("grades"),
      writable("assignments"),
    ],
  },
  {
    name: "Human Resources",
    description: "Staff records and department-level attendance oversight",
    roles: ["HR_ADMIN"],
    features: [writable("users"), readOnly("attendance", "department")],
  },
  {
    name: "Teaching",
    description: "Teacher access scoped to assigned classes and departments",
    roles: ["TEACHER"],
    features: [
      writable("attendance", "own"),
      writable("grades", "own"),
      writable("assignments", "own"),
      readOnly("users", "department"),
    ],
  },
];

export type FeaturePerms = {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  scope: string;
};

function full(featureKey: string, canDelete = true, scope = "school"): PermissionFeatureSeed {
  return {
    feature_key: featureKey,
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: canDelete,
    scope,
  };
}

function writable(featureKey: string, scope = "school"): PermissionFeatureSeed {
  return {
    feature_key: featureKey,
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: false,
    scope,
  };
}

function readOnly(featureKey: string, scope = "school"): PermissionFeatureSeed {
  return {
    feature_key: featureKey,
    can_create: false,
    can_read: true,
    can_update: false,
    can_delete: false,
    scope,
  };
}

export function mergeFeaturePermission(
  existing: FeaturePerms | undefined,
  incoming: FeaturePerms
): FeaturePerms {
  if (!existing) return incoming;
  return {
    can_create: existing.can_create || incoming.can_create,
    can_read: existing.can_read || incoming.can_read,
    can_update: existing.can_update || incoming.can_update,
    can_delete: existing.can_delete || incoming.can_delete,
    scope: incoming.scope,
  };
}

/**
 * Pre-computed role → feature map from DEFAULT_PERMISSION_GROUPS.
 * Used only when a school has not yet been seeded with permission_features rows.
 */
export function buildRolePermissionFallback(): Partial<Record<KnownRole, Record<string, FeaturePerms>>> {
  const result: Partial<Record<KnownRole, Record<string, FeaturePerms>>> = {};

  for (const group of DEFAULT_PERMISSION_GROUPS) {
    for (const role of group.roles) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) continue;

      const roleMap = result[normalizedRole] || {};
      for (const feature of group.features) {
        const perms: FeaturePerms = {
          can_create: feature.can_create,
          can_read: feature.can_read,
          can_update: feature.can_update,
          can_delete: feature.can_delete,
          scope: feature.scope,
        };
        roleMap[feature.feature_key] = mergeFeaturePermission(
          roleMap[feature.feature_key],
          perms
        );
      }
      result[normalizedRole] = roleMap;
    }
  }

  return result;
}
