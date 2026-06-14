import { NextResponse } from "next/server";

import { applyEdgeCacheHeaders, type EdgeCachePreset } from "@/lib/edge-cache";

export { EDGE_CACHE, READ_MOSTLY_PRIVATE_CACHE } from "@/lib/edge-cache";

export type TeacherWorkspaceStats = {
  lessons: number;
  students: number;
  completed: number;
  pending: number;
};

export type TeacherWorkloadSummary = {
  unreadMessages: number;
  unreadNotifications: number;
  pendingGrades: number;
  draftResults: number;
  upcomingEvents: number;
};

export type TeacherProfileSummary = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
} | null;

export type TeacherFirstLoginSummary = {
  mustChangePassword?: boolean;
  temporaryPasswordIssuedAt?: string | null;
} | null;

export type TeacherAccountSummary = {
  employeeId?: string | null;
  department?: string | null;
  specialization?: string | null;
  hireDate?: string | null;
  tenure?: { label?: string | null; days?: number | null } | null;
  assignedClasses?: Array<{ id: string; name: string }>;
  assignedSubjects?: Array<{ id: string; name: string }>;
  supervisedClasses?: Array<{ id: string; name: string }>;
  pendingRollCalls?: number;
} | null;

export type TeacherBootstrapData = {
  displayName: string;
  schoolName: string;
  yearTerm: string;
  profile: TeacherProfileSummary;
  firstLogin: TeacherFirstLoginSummary;
  teacher: TeacherAccountSummary;
  stats: TeacherWorkspaceStats;
  workload: TeacherWorkloadSummary;
};

export type TeacherBootstrapPayload = {
  success?: boolean;
  data?: TeacherBootstrapData | null;
  error?: string;
};

export function jsonWithPrivateCache(
  payload: unknown,
  preset: EdgeCachePreset = "privateRead"
) {
  return applyEdgeCacheHeaders(NextResponse.json(payload), preset);
}

export function buildDisplayName(
  row:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  fallback = "User"
) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    row?.name ||
    row?.email ||
    fallback
  );
}

export function isVisibleToRole(targetRole: string | null | undefined, role: string | null | undefined) {
  const normalizedTargetRole = String(targetRole || "").trim().toUpperCase();
  if (!normalizedTargetRole || normalizedTargetRole === "ALL" || normalizedTargetRole === "GENERAL") {
    return true;
  }

  return normalizedTargetRole === String(role || "").trim().toUpperCase();
}

export function buildAcademicContextLabel(parts: Array<string | null | undefined>) {
  const normalized = parts.map((part) => String(part || "").trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(" - ") : "Academic Context";
}
