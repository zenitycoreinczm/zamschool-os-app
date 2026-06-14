"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Surface } from "@/components/workspace/Surface";
import { WorkspaceLoader } from "@/components/workspace/WorkspaceLoader";
import { CalendarClock, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

type TimetableRow = {
  id: string;
  title: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(value: string) {
  const [hoursText = "0", minutesText = "00"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ParentTimetablePage() {
  const [lessons, setLessons] = useState<TimetableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const load = async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/parent/timetable", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const body = await res.json();
        setLessons(body.data ?? []);
      } else {
        setError("Failed to load timetable");
      }
      setLoading(false);
    };

    void load();
  }, []);

  const filteredLessons = lessons.filter((l) => l.dayOfWeek === selectedDay);

  if (loading) return <WorkspaceLoader label="Loading timetable" />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Class Timetable</h1>
        <p className="text-sm text-slate-500">Weekly schedule for your children&apos;s classes</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAY_NAMES.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(idx)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              selectedDay === idx
                ? "bg-teal-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {error ? (
        <Surface variant="elevated" className="p-6 text-center">
          <p className="text-sm text-rose-600">{error}</p>
        </Surface>
      ) : filteredLessons.length === 0 ? (
        <Surface variant="elevated" className="p-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No classes scheduled for {DAY_NAMES[selectedDay]}.</p>
        </Surface>
      ) : (
        <div className="space-y-3">
          {filteredLessons.map((lesson) => (
            <Surface key={lesson.id} variant="elevated" className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                  {lesson.subjectCode && (
                    <p className="text-xs text-slate-400">{lesson.subjectCode}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {lesson.teacherName}
                    </span>
                    {lesson.room && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Room {lesson.room}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                  {lesson.className}
                </span>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
