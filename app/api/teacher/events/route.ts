import { NextResponse } from "next/server";

import { matchesRoleTarget } from "@/lib/role-audience-match";
import {
  jsonWithPrivateCache,
  READ_MOSTLY_PRIVATE_CACHE,
} from "@/lib/teacher-route-common";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);
    const upcomingOnly = searchParams.get("upcomingOnly") === "true";

    const rows = await loadEvents({
      schoolId: access.context.schoolId,
      limit,
      upcomingOnly,
    });

    const response = jsonWithPrivateCache({
      data: rows.filter((row: any) => matchesRoleTarget(row.target_role || row.audience, "teacher")),
    });
    response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch teacher events") },
      { status: 500 }
    );
  }
}

async function loadEvents(input: { schoolId: string; limit: number; upcomingOnly: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const queryAttempts = [
    () =>
      buildEventsQuery(
        "id, title, description, event_date, start_time, end_time, location, target_role, created_at",
        input.schoolId,
        input.limit,
        input.upcomingOnly,
        today
      ),
    () =>
      buildEventsQuery(
        "id, title, description, event_date, start_time, end_time, location, created_at",
        input.schoolId,
        input.limit,
        input.upcomingOnly,
        today
      ),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) return result.data || [];
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
