import { adminApiJson } from "@/lib/admin-browser-api";
import type { DashboardSummary } from "@/lib/dashboard-summary-server";

export type { DashboardSummary, DashboardRoleCounts, DashboardStudentTotals } from "@/lib/dashboard-summary-server";

export type DashboardScope = {
  schoolId: string;
  academicLabel: string;
};

const DASHBOARD_SUMMARY_TTL_MS = 60_000;

let cachedSummary: { expiresAt: number; data: DashboardSummary } | null = null;
let summaryPromise: Promise<DashboardSummary> | null = null;

export function readCachedDashboardSummary() {
  if (!cachedSummary) {
    return null;
  }

  if (Date.now() >= cachedSummary.expiresAt) {
    cachedSummary = null;
    return null;
  }

  return cachedSummary.data;
}

export function invalidateDashboardSummary() {
  cachedSummary = null;
  summaryPromise = null;
}

export async function fetchDashboardSummary(options: { force?: boolean } = {}) {
  if (!options.force) {
    const cached = readCachedDashboardSummary();
    if (cached) {
      return cached;
    }
  }

  if (!options.force && summaryPromise) {
    return summaryPromise;
  }

  summaryPromise = adminApiJson<{ data?: DashboardSummary }>("/api/dashboard/summary").then((payload) => {
    if (!payload.data?.schoolId) {
      throw new Error("Failed to load dashboard summary");
    }
    return payload.data;
  }).then((data) => {
    cachedSummary = {
      expiresAt: Date.now() + DASHBOARD_SUMMARY_TTL_MS,
      data,
    };
    return data;
  }).finally(() => {
    summaryPromise = null;
  });

  return summaryPromise;
}

/** @deprecated Prefer fetchDashboardSummary — kept for callers that only need scope. */
export async function loadDashboardScope(): Promise<DashboardScope | null> {
  try {
    const summary = await fetchDashboardSummary();
    return {
      schoolId: summary.schoolId,
      academicLabel: summary.academicLabel,
    };
  } catch {
    return null;
  }
}

export function getRoleVariants(role: string) {
  return [role];
}