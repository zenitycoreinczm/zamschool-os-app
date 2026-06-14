import { CACHE_CONFIGS, withCache } from "@/lib/enhanced-cache";
import { supabaseAdmin } from "@/lib/supabase";

export type AnnouncementRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  target_role?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  [key: string]: unknown;
};

export async function loadSchoolAnnouncements(schoolId: string, limit: number) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return withCache(
    `school:${schoolId}:limit:${safeLimit}`,
    () => fetchSchoolAnnouncementsFromDb(schoolId, safeLimit),
    {
      ...CACHE_CONFIGS.shared.announcements,
      tags: ["announcements"],
    }
  );
}

export async function invalidateSchoolAnnouncementsCache() {
  const { invalidateByTag } = await import("@/lib/enhanced-cache");
  await invalidateByTag("announcements");
}

async function fetchSchoolAnnouncementsFromDb(schoolId: string, limit: number) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, content, target_role, created_at, published_at, is_pinned")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, target_role, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, content, target_role, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabaseAdmin
        .from("announcements")
        .select("id, title, body, content, created_at, published_at")
        .eq("school_id", schoolId)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return (result.data || []) as AnnouncementRow[];
    }
  }

  return [];
}