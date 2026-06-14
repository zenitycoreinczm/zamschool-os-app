import { NextResponse } from "next/server";

import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { matchesRoleTarget } from "@/lib/role-audience-match";
import { requireActorContext } from "@/lib/server-auth";
import { KNOWN_ROLES } from "@/lib/roles";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

type AccountEventRow = {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  target_role?: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    const access = await requireActorContext(
      {
        allowedRoles: [...KNOWN_ROLES],
        requireSchool: true,
      },
      req
    );
    if (!access.ok) {
      return access.response;
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);
    const upcomingOnly = searchParams.get("upcomingOnly") === "true";
    const schoolId = access.context.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const rows = await loadEvents({ schoolId, limit, upcomingOnly });

    return jsonWithPrivateCache({
      data: rows.filter((row) => matchesRoleTarget(row.target_role || (row as any).audience, access.context.role)),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch account events") },
      { status: 500 }
    );
  }
}

async function loadEvents({
  schoolId,
  limit,
  upcomingOnly,
}: {
  schoolId: string;
  limit: number;
  upcomingOnly: boolean;
}): Promise<AccountEventRow[]> {
  const today = new Date().toISOString().slice(0, 10);

  const queryAttempts = [
    () =>
      buildEventsQuery(
        "id, title, description, event_date, start_time, end_time, location, target_role, created_at",
        schoolId,
        limit,
        upcomingOnly,
        today
      ),
    () =>
      buildEventsQuery(
        "id, title, description, event_date, start_time, end_time, location, created_at",
        schoolId,
        limit,
        upcomingOnly,
        today
      ),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return (result.data || []) as unknown as AccountEventRow[];
    }
  }

  return [];
}

function buildEventsQuery(
  selectClause: string,
  schoolId: string,
  limit: number,
  upcomingOnly: boolean,
  today: string
) {
  let query = supabaseAdmin
    .from("events")
    .select(selectClause)
    .eq("school_id", schoolId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (upcomingOnly) {
    query = query.gte("event_date", today);
  }

  return query;
}

function jsonWithPrivateCache(payload: unknown) {
  const response = NextResponse.json(payload);
  return applyEdgeCacheHeaders(response, "eventsRead");
}
