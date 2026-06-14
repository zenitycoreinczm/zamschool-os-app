"use client";

import { useCallback, useEffect, useState } from "react";

import { adminApiJson } from "@/lib/admin-browser-api";
import type { WorkspaceMetric } from "@/lib/workspace-summary";

type SummaryPayload = {
  data?: {
    metrics?: WorkspaceMetric[];
    highlights?: string[];
  };
};

export function useWorkspaceSummary() {
  const [metrics, setMetrics] = useState<WorkspaceMetric[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await adminApiJson<SummaryPayload>("/api/workspace/summary");
      setMetrics(body.data?.metrics || []);
      setHighlights(body.data?.highlights || []);
    } catch (err: unknown) {
      setMetrics([]);
      setHighlights([]);
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { metrics, highlights, loading, error, refresh };
}