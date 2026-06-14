import { NextResponse } from "next/server";

import {
  isVisibleToRole,
  jsonWithPrivateCache,
  READ_MOSTLY_PRIVATE_CACHE,
} from "@/lib/teacher-route-common";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { loadSchoolAnnouncements } from "@/lib/announcements-server";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);
    const rows = await loadSchoolAnnouncements(access.context.schoolId, limit);

    const response = jsonWithPrivateCache({
      data: rows
        .filter((row: any) => isVisibleToRole(row.target_role, access.context.role))
        .map((row: any) => ({
          ...row,
          body: row.body || row.content || "",
          content: row.content || row.body || "",
        })),
    });
    response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch teacher announcements") },
      { status: 500 }
    );
  }
}
