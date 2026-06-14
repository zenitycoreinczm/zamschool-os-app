"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { isAbortLikeError } from "@/lib/async-guards";
import { fetchAnnouncementsList } from "@/lib/announcements-client";

function resolveAnnouncementsEndpoint(pathname: string) {
  if (pathname.startsWith("/teacher")) {
    return "/api/teacher/announcements?limit=3";
  }
  if (pathname.startsWith("/student") || pathname.startsWith("/parent")) {
    return "/api/account/announcements?limit=3";
  }
  return "/api/admin/announcements?limit=3";
}

export default function Announcements() {
  const pathname = usePathname();
  const endpoint = useMemo(() => resolveAnnouncementsEndpoint(pathname), [pathname]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAnnouncements = async () => {
      setLoading(true);

      try {
        const rows = await fetchAnnouncementsList(endpoint);
        if (cancelled) return;
        setAnnouncements(rows.slice(0, 3));
      } catch (err) {
        if (cancelled || isAbortLikeError(err)) return;
        console.error("Error fetching announcements:", err);
        setAnnouncements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const viewAllHref = pathname.startsWith("/teacher")
    ? "/teacher/announcements"
    : pathname.startsWith("/student")
      ? "/student/announcements"
      : pathname.startsWith("/parent")
        ? "/parent/announcements"
        : "/app/announcements";

  return (
    <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-lamaPurple" />
          <h1 className="text-[2rem] font-bold text-slate-900">Announcements</h1>
        </div>
        <Link href={viewAllHref} className="text-xs font-bold text-slate-400 transition hover:text-slate-600 hover:underline">
          View All
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No recent announcements</p>
          </div>
        ) : (
          announcements.map((ann, index) => (
            <div
              key={ann.id}
              className={`rounded-2xl p-4 border transition-all hover:shadow-md ${
                index === 0
                  ? "bg-[#eef8ff] border-[#d9eefc]"
                  : index === 1
                    ? "bg-[#f4f1ff] border-[#e1dbff]"
                    : "bg-[#fff8e8] border-[#f6e7b8]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-800">{ann.title}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {formatDate(ann.published_at || ann.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">{ann.body || ann.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}