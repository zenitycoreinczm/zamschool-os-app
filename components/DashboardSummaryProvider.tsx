"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  fetchDashboardSummary,
  readCachedDashboardSummary,
  type DashboardSummary,
} from "@/lib/dashboard-client";

type DashboardSummaryContextValue = {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const DashboardSummaryContext = createContext<DashboardSummaryContextValue | null>(null);

export function DashboardSummaryProvider({ children }: { children: ReactNode }) {
  const initial = readCachedDashboardSummary();
  const [summary, setSummary] = useState<DashboardSummary | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const load = useCallback(async (force = false) => {
    setError("");
    if (!summaryRef.current) {
      setLoading(true);
    }

    try {
      const next = await fetchDashboardSummary({ force });
      setSummary(next);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
      if (force && !summaryRef.current) {
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) {
      void load(false);
    }
  }, [initial, load]);

  const value = useMemo(
    () => ({
      summary,
      loading,
      error,
      refresh: () => load(true),
    }),
    [summary, loading, error, load]
  );

  return (
    <DashboardSummaryContext.Provider value={value}>{children}</DashboardSummaryContext.Provider>
  );
}

export function useDashboardSummary() {
  const context = useContext(DashboardSummaryContext);
  if (!context) {
    return null;
  }
  return context;
}