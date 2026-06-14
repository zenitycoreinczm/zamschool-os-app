"use client";

import { useEffect } from "react";
import { validateClientEnv } from "@/lib/client-env-validation";

export function ClientEnvValidator() {
  useEffect(() => {
    const result = validateClientEnv();

    if (!result.valid) {
      const message = `Missing required environment variables: ${result.missing.join(", ")}`;
      console.error("[ClientEnv] " + message);

      if (typeof window !== "undefined" && !window.location.href.includes("/login")) {
        console.warn("[ClientEnv] Redirecting to login due to missing env vars");
      }
    }

    if (result.warnings.length > 0) {
      console.warn(`[ClientEnv] Optional variables not set: ${result.warnings.join(", ")}`);
    }
  }, []);

  return null;
}