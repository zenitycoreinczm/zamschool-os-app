"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, Loader2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";
import { formatDate } from "@/lib/utils";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  category: string | null;
};

export default function TeacherEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const body = await adminApiJson<{ success: boolean; data: EventRow[] }>(
        "/api/teacher/events",
      );
      setEvents(Array.isArray(body.data) ? body.data : []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load events";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4 md:p-6">
        <section className="grid w-full max-w-lg place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 shadow-sm">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Loading events…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Calendar
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Events
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={loadEvents}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Refresh
          </button>
        </div>
      </section>

      {events.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No events scheduled
          </p>
          <p className="mt-1 text-xs text-slate-400">
            School events will appear here when scheduled
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{event.title}</h3>
                {event.category && (
                  <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    {event.category}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {event.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(event.startDate)}
                  {event.endDate && ` — ${formatDate(event.endDate)}`}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
