import { NextResponse } from "next/server";

import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { withCache, CACHE_CONFIGS } from "@/lib/enhanced-cache";
import { safeErrorMessage } from "@/lib/server-guards";
import { requireParentContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireParentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;

    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const dashboardData = await withCache(
      `parent:${userId}:${schoolId}`,
      async () => {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("id", userId)
          .eq("school_id", schoolId)
          .maybeSingle();

        const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.email || "Parent";

        const { data: parentRecord } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("profile_id", userId)
          .eq("school_id", schoolId)
          .maybeSingle();

        const [{ count: childrenCount }] = await Promise.all([
          parentRecord
            ? supabaseAdmin
                .from("parent_students")
                .select("id", { count: "exact", head: true })
                .eq("parent_id", parentRecord.id)
            : Promise.resolve({ count: 0 }),
        ]);

        const [unreadResult, announcementsResult] = await Promise.all([
          supabaseAdmin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("recipient_id", userId)
            .eq("is_read", false),
          supabaseAdmin
            .from("announcements")
            .select("id, title, created_at")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (unreadResult.error) throw unreadResult.error;
        if (announcementsResult.error) throw announcementsResult.error;

        return {
          profile: {
            displayName,
            email: profile?.email || null,
          },
          childrenCount,
          unreadMessages: unreadResult.count || 0,
          recentAnnouncements: (announcementsResult.data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            createdAt: a.created_at,
          })),
        };
      },
      {
        ...CACHE_CONFIGS.parent.dashboard,
        tags: ["dashboard"],
      }
    );

    const response = NextResponse.json({
      success: true,
      data: dashboardData,
    });

    return applyEdgeCacheHeaders(response, "dashboardRead");
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load parent dashboard") },
      { status: 500 }
    );
  }
}