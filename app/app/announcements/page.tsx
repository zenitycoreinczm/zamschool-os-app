"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Radio, Users } from "lucide-react";

import Announcements from "@/components/Announcements";
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer";
import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { adminApiJson } from "@/lib/admin-browser-api";

type ClassOption = { id: string; label: string };

export default function AppAnnouncementsPage() {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const body = await adminApiJson<{ data?: Array<{ id: string; name?: string }> }>(
        "/api/admin/classes"
      );
      const options = (body.data || [])
        .map((row) => ({
          id: row.id,
          label: String(row.name || "").trim() || row.id,
        }))
        .filter((row) => row.id);
      setClassOptions(options);
    } catch {
      setClassOptions([]);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  return (
    <div className="space-y-4">
      <AdminPageHero
        eyebrow="School communications"
        title="Announcements"
        description="Publish once — students, parents, and staff see filtered copies in their portals. Compose below, then review the live feed."
        accent="sky"
        stats={[
          {
            label: "Classes",
            value: loadingClasses ? "…" : classOptions.length,
            hint: "Targeting options",
            icon: Users,
            tone: "sky",
          },
          {
            label: "Composer",
            value: "Publish",
            hint: "New announcement",
            icon: Megaphone,
            tone: "sky",
          },
          {
            label: "Feed",
            value: "Live",
            hint: "School-wide",
            icon: Radio,
            tone: "emerald",
          },
        ]}
      />

      <AnnouncementComposer
        classOptions={classOptions}
        onPublished={() => setRefreshKey((value) => value + 1)}
      />

      {loadingClasses ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          Loading announcement feeds...
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <Announcements key={refreshKey} />
        </div>
      )}
    </div>
  );
}