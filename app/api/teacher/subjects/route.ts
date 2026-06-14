import { NextResponse } from "next/server";

import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage, getClientIp, applyRateLimit } from "@/lib/server-guards";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { EDGE_CACHE } from "@/lib/edge-cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    // Apply rate limiting
    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `teacher-subjects:${userId}:${ip}`,
      limit: 120,
      windowMs: 60_000, // 120 requests per minute
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId,
      actorProfileId: userId,
    });

    if (assignmentScope.allowedClassIds.length === 0) {
      const response = NextResponse.json({ success: true, data: [] });
      return applyEdgeCacheHeaders(response, "eventsRead");
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("subject_id")
      .eq("school_id", schoolId)
      .in("teacher_id", assignmentScope.actorTeacherIds)
      .in("class_id", assignmentScope.allowedClassIds)
      .not("subject_id", "is", null);

    if (lessonsError) throw lessonsError;

    const subjectIds = Array.from(
      new Set((lessons || []).map((l: any) => l.subject_id).filter(Boolean))
    );

    if (subjectIds.length === 0) {
      const response = NextResponse.json({ success: true, data: [] });
      return applyEdgeCacheHeaders(response, "eventsRead");
    }

    const { data: subjects, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code")
      .eq("school_id", schoolId)
      .in("id", subjectIds)
      .order("name", { ascending: true });

    if (error) throw error;

    const response = NextResponse.json({ success: true, data: subjects || [] });
    return applyEdgeCacheHeaders(response, "eventsRead");
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load subjects") },
      { status: 500 }
    );
  }
}
