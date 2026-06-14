import { NextResponse } from "next/server";

import { applyEdgeCacheHeaders } from "@/lib/edge-cache";

/**
 * Lightweight liveness probe for load tests, uptime monitors, and k6.
 * Does not hit Supabase — use /api/health/ready for dependency checks later.
 */
export async function GET() {
  return applyEdgeCacheHeaders(
    NextResponse.json({
      ok: true,
      service: "zamschool-os",
      timestamp: new Date().toISOString(),
    }),
    "publicHealth"
  );
}