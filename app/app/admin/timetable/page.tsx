"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { adminApiJson } from "@/lib/admin-browser-api";
import { fetchGatewayRead } from "@/lib/gateway-read-client";
import { getDisplayName } from "@/lib/profile-utils";
import { useWorkspaceContext } from "@/components/WorkspaceContextProvider";
import { normalizeRole } from "@/lib/roles";
import {
  buildMobileDaySections,
  buildTimetableBoard,
  getLessonActionItems,
  toMinutes,
  type LessonCardView,
  type TimetableLesson,
} from "@/lib/timetable-workspace";
import { CalendarDays, Clock3, Loader2, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type SelectOpt = { id: string; name: string };
type LessonForm = {
  title: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
];

const TIME_CHOICES = buildTimeChoices("06:00", "20:00", 5);

const EMPTY_FORM: LessonForm = {
  title: "",
  class_id: "",
  subject_id: "",
  teacher_id: "",
  day_of_week: "1",
  start_time: "07:00",
  end_time: "08:00",
};

export default function AdminTimetablePage() {
  const { data: wsData } = useWorkspaceContext();
  const currentRole = normalizeRole(wsData?.role);
  const currentUserId = wsData?.userId || null;
  const isTeacherView = currentRole === "TEACHER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<SelectOpt[]>([]);
  const [subjects, setSubjects] = useState<SelectOpt[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [lessons, setLessons] = useState<TimetableLesson[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [form, setForm] = useState<LessonForm>(EMPTY_FORM);
  const [openForm, setOpenForm] = useState(false);
  const [menuLessonId, setMenuLessonId] = useState<string | null>(null);
  const [detailLessonId, setDetailLessonId] = useState<string | null>(null);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((x) => [x.id, x.name])), [subjects]);
  const classMap = useMemo(() => Object.fromEntries(classes.map((x) => [x.id, x.name])), [classes]);
  const teacherMap = useMemo(() => Object.fromEntries(teachers.map((x) => [x.id, x.name])), [teachers]);

  // For teachers, filter to only their own lessons
  const visibleLessons = useMemo(() => {
    if (!isTeacherView || !currentUserId) return lessons;
    return lessons.filter((l) => l.teacher_id === currentUserId);
  }, [lessons, isTeacherView, currentUserId]);

  const board = useMemo(
    () => buildTimetableBoard({ lessons: visibleLessons, selectedClass, classMap, subjectMap, teacherMap }),
    [classMap, visibleLessons, selectedClass, subjectMap, teacherMap]
  );
  const mobileSections = useMemo(
    () => buildMobileDaySections({ lessons: visibleLessons, selectedClass, classMap, subjectMap, teacherMap }),
    [classMap, visibleLessons, selectedClass, subjectMap, teacherMap]
  );

  const cardsById = useMemo(() => {
    const map = new Map<string, LessonCardView>();
    for (const day of board.days) {
      for (const slot of day.slots) {
        for (const lesson of slot.lessons) {
          if (!map.has(lesson.id)) map.set(lesson.id, lesson);
        }
      }
    }
    return map;
  }, [board.days]);

  const detailLesson = detailLessonId ? lessons.find((x) => x.id === detailLessonId) ?? null : null;
  const detailCard = detailLessonId ? cardsById.get(detailLessonId) ?? null : null;
  const visibleClassLabel = selectedClass === "all" ? "All classes" : classMap[selectedClass] || "Selected class";

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const schoolBody = await adminApiJson<{ data?: { profile?: { school_id?: string | null } } }>("/api/admin/school");
        const sid = schoolBody.data?.profile?.school_id;
        if (!sid) throw new Error("No school linked to this account");
        setSchoolId(sid);
        await fetchAll();
      } catch (err: any) {
        toast.error(err?.message || "Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  async function fetchAll() {
    const [classesRes, subjectRes, teacherRes, lessonsRes] = await Promise.all([
      fetchGatewayRead("/api/admin/classes", {
        cache: "no-store",
        fallbackToLocal: true,
      }),
      adminApiJson<{ data?: SelectOpt[] }>("/api/admin/subjects"),
      adminApiJson<{ data?: { teachers?: any[] } }>("/api/admin/users"),
      fetchGatewayRead("/api/admin/timetable", {
        cache: "no-store",
        fallbackToLocal: true,
      }),
    ]);
    const classesBody = await classesRes.json();
    const lessonsBody = await lessonsRes.json();
    if (!classesRes.ok) throw new Error(classesBody?.error || "Failed to load classes");
    if (!lessonsRes.ok) throw new Error(lessonsBody?.error || "Failed to load timetable");
    const nextClasses = toClassOptions(classesBody?.data);
    const nextSubjects = (subjectRes.data || []).map((x: any) => ({ id: x.id, name: x.name }));
    const nextTeachers = (teacherRes.data?.teachers || []).map((x: any) => ({ id: x.id, name: getDisplayName(x) }));
    setClasses(nextClasses);
    setSubjects(nextSubjects);
    setTeachers(nextTeachers);
    setLessons((lessonsBody?.data || []) as TimetableLesson[]);
    setForm((prev) => ({
      ...prev,
      class_id: prev.class_id || nextClasses[0]?.id || "",
      subject_id: prev.subject_id || nextSubjects[0]?.id || "",
      teacher_id: prev.teacher_id || nextTeachers[0]?.id || "",
    }));
  }

  async function createLesson() {
    if (!schoolId) return;
    if (!form.class_id || !form.subject_id || !form.teacher_id) {
      toast.error("Class, subject, and teacher are required");
      return;
    }
    const startTime = normalizeTimeValue(form.start_time);
    const endTime = normalizeTimeValue(form.end_time);

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      toast.error("End time must be after start time");
      return;
    }
    setSaving(true);
    const id = toast.loading("Saving lesson...");
    try {
      await adminApiJson("/api/admin/timetable", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim() || null,
          classId: form.class_id,
          subjectId: form.subject_id,
          teacherId: form.teacher_id,
          dayOfWeek: Number(form.day_of_week),
          startTime,
          endTime,
        }),
      });
      await fetchAll();
      setOpenForm(false);
      toast.success("Lesson saved", { id });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save lesson", { id });
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(id: string) {
    if (!schoolId) return;
    if (!confirm("Delete this lesson from the timetable?")) return;
    const toastId = toast.loading("Deleting lesson...");
    try {
      await adminApiJson(`/api/admin/timetable?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await fetchAll();
      setDetailLessonId(null);
      setMenuLessonId(null);
      toast.success("Lesson deleted", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete lesson", { id: toastId });
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-500">Loading timetable workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Schedule Workspace</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Timetable</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Plan lessons by class, inspect the full week, and manage lesson changes from an explicit action flow.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Visible lessons</div><div className="mt-2 text-lg font-semibold text-slate-900">{board.totalLessons}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Busiest day</div><div className="mt-2 text-lg font-semibold text-slate-900">{board.busiestDayLabel}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Class lens</div><div className="mt-2 text-lg font-semibold text-slate-900">{visibleClassLabel}</div></div>
            </div>
          </div>
          <div className="w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:max-w-md">
            {!isTeacherView ? (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Class lens</span>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-100">
                  <option value="all">All classes</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ) : (
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">My schedule</span>
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">Showing your personal lessons</p>
              </div>
            )}
            {!isTeacherView ? (
              <button type="button" onClick={() => setOpenForm(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus className="h-4 w-4" /> Add lesson
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4 lg:hidden">
        {mobileSections.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No lessons in this view yet.</div>
        ) : mobileSections.map((section) => (
          <div key={section.key} className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3"><h2 className="text-base font-semibold text-slate-900">{section.label}</h2><p className="text-xs text-slate-500">{section.lessons.length} lessons</p></div>
            <div className="space-y-3">
              {section.lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} compact menuOpen={menuLessonId === lesson.id} onToggleMenu={isTeacherView ? () => {} : () => setMenuLessonId((current) => current === lesson.id ? null : lesson.id)} onView={() => { setDetailLessonId(lesson.id); setMenuLessonId(null); }} onDelete={() => void deleteLesson(lesson.id)} readOnly={isTeacherView} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="hidden rounded-workspace-xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-lg font-semibold text-slate-900">Weekly board</h2><p className="text-sm text-slate-500">Lessons are arranged in 30-minute slots.</p></div>
        <div className="overflow-x-auto">
          <div className="min-w-[1080px] grid" style={{ gridTemplateColumns: "112px repeat(5, minmax(0, 1fr))" }}>
            <Cell className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Time</Cell>
            {board.days.map((day) => <Cell key={day.key} className="bg-slate-50"><div className="text-sm font-semibold text-slate-800">{day.fullLabel}</div><div className="mt-1 text-xs text-slate-500">{day.totalLessons} lessons</div></Cell>)}
            {board.days[0]?.slots.map((slot, index) => (
              <ScheduleRow key={slot.label} slotLabel={slot.label} slotIndex={index} days={board.days} menuLessonId={menuLessonId} onToggleMenu={isTeacherView ? () => {} : (id) => setMenuLessonId((current) => current === id ? null : id)} onView={(id) => { setDetailLessonId(id); setMenuLessonId(null); }} onDelete={(id) => void deleteLesson(id)} readOnly={isTeacherView} />
            ))}
          </div>
        </div>
      </section>

      {openForm ? (
        <Modal title="Add lesson" subtitle="Create a timetable entry with a class, subject, teacher, and time." onClose={() => setOpenForm(false)}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Lesson title" value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
                <SelectField label="Class" value={form.class_id} onChange={(value) => setForm((prev) => ({ ...prev, class_id: value }))} options={classes.map((x) => ({ value: x.id, label: x.name }))} />
                <SelectField label="Subject" value={form.subject_id} onChange={(value) => setForm((prev) => ({ ...prev, subject_id: value }))} options={subjects.map((x) => ({ value: x.id, label: x.name }))} />
                <SelectField label="Teacher" value={form.teacher_id} onChange={(value) => setForm((prev) => ({ ...prev, teacher_id: value }))} options={teachers.map((x) => ({ value: x.id, label: x.name }))} />
                <SelectField label="Day" value={form.day_of_week} onChange={(value) => setForm((prev) => ({ ...prev, day_of_week: value }))} options={DAY_OPTIONS} />
                <TimeField label="Start time" value={form.start_time} onChange={(value) => setForm((prev) => ({ ...prev, start_time: value }))} />
                <TimeField label="End time" value={form.end_time} onChange={(value) => setForm((prev) => ({ ...prev, end_time: value }))} />
              </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setOpenForm(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Cancel</button>
            <button type="button" onClick={() => void createLesson()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save lesson</button>
          </div>
        </Modal>
      ) : null}

      {detailLesson && detailCard ? (
        <Modal title={detailCard.title} subtitle={`${DAY_OPTIONS.find((day) => Number(day.value) === detailLesson.day_of_week)?.label || "Day"} · ${detailCard.timeRange}`} onClose={() => setDetailLessonId(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Subject" value={detailCard.subject} />
            <Metric label="Teacher" value={detailCard.teacher} />
            <Metric label="Class" value={detailCard.className} />
            <Metric label="Duration" value={`${detailCard.durationMinutes} minutes`} />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDetailLessonId(null)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Close</button>
            {!isTeacherView ? <button type="button" onClick={() => void deleteLesson(detailLesson.id)} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"><Trash2 className="h-4 w-4" /> Delete lesson</button> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ScheduleRow({ slotLabel, slotIndex, days, menuLessonId, onToggleMenu, onView, onDelete, readOnly = false }: { slotLabel: string; slotIndex: number; days: ReturnType<typeof buildTimetableBoard>["days"]; menuLessonId: string | null; onToggleMenu: (id: string) => void; onView: (id: string) => void; onDelete: (id: string) => void; readOnly?: boolean; }) {
  return <>
    <Cell className="bg-slate-50 text-xs font-medium text-slate-500">{slotLabel}</Cell>
    {days.map((day) => {
      const slot = day.slots[slotIndex];
      return <Cell key={`${day.key}-${slot.label}`} className="align-top bg-white">{slot.lessons.length === 0 ? <div className="h-full rounded-2xl border border-dashed border-slate-100 bg-slate-50/60" /> : <div className="space-y-2">{slot.lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} menuOpen={menuLessonId === lesson.id} onToggleMenu={() => onToggleMenu(lesson.id)} onView={() => onView(lesson.id)} onDelete={() => onDelete(lesson.id)} readOnly={readOnly} />)}</div>}</Cell>;
    })}
  </>;
}

function LessonCard({ lesson, compact = false, menuOpen, onToggleMenu, onView, onDelete, readOnly = false }: { lesson: LessonCardView; compact?: boolean; menuOpen: boolean; onToggleMenu: () => void; onView: () => void; onDelete: () => void; readOnly?: boolean; }) {
  const tone = toneClasses(lesson.tone);
  return (
    <div className={`relative rounded-2xl border px-3 py-3 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{lesson.title}</p>
              <p className="mt-1 text-xs text-slate-500">{compact ? lesson.subject : lesson.teacher}</p>
            </div>
            {!readOnly ? <ActionMenu open={menuOpen} onToggle={onToggleMenu} onView={onView} onDelete={onDelete} /> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{lesson.timeRange}</span>
            {!compact ? <span>{lesson.durationMinutes} min</span> : null}
            <span>{compact ? lesson.teacher : lesson.className}</span>
            {compact ? <span>{lesson.className}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ open, onToggle, onView, onDelete }: { open: boolean; onToggle: () => void; onView: () => void; onDelete: () => void; }) {
  return (
    <div className="relative isolate overflow-visible">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className="zamschool-workspace-popover absolute right-0 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
          role="menu"
        >
          {getLessonActionItems({ id: "x" }).map((action) =>
            action.key === "view" ? (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={onView}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              >
                {action.label}
              </button>
            ) : (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={onDelete}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm"><div className="mx-auto grid min-h-full max-w-3xl place-items-center"><div className="w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Timetable</p><h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button></div>{children}</div></div></div>;
}

function Metric({ label, value }: { label: string; value: string; }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div>;
}

function Cell({ className, children }: { className?: string; children: React.ReactNode; }) {
  return <div className={`min-h-20 border-b border-r border-slate-100 px-3 py-3 ${className || ""}`}>{children}</div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string; }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-100" /></label>;
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void; }) {
  const listId = useId();

  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type="text"
        list={listId}
        value={value}
        inputMode="numeric"
        placeholder="07:00"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeTimeValue(e.target.value))}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-100"
      />
      <datalist id={listId}>
        {TIME_CHOICES.map((option) => <option key={option} value={option} />)}
      </datalist>
      <p className="mt-1 text-[11px] text-slate-400">Suggested range starts at 07:00, but you can type any valid time.</p>
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function toneClasses(tone: LessonCardView["tone"]) {
  switch (tone) {
    case "emerald": return "border-emerald-200 bg-emerald-50/80";
    case "amber": return "border-amber-200 bg-amber-50/80";
    case "violet": return "border-violet-200 bg-violet-50/80";
    case "rose": return "border-rose-200 bg-rose-50/80";
    default: return "border-sky-200 bg-sky-50/80";
  }
}

function toClassOptions(rows: unknown): SelectOpt[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row: any) => {
    const id = typeof row?.id === "string" ? row.id : "";
    const className = typeof row?.name === "string" ? row.name.trim() : "";
    const gradeName = typeof row?.grades?.name === "string" ? row.grades.name.trim() : "";
    const name = [gradeName, className].filter(Boolean).join(" - ") || className || gradeName;
    return id && name ? [{ id, name }] : [];
  });
}

function buildTimeChoices(start: string, end: string, stepMinutes: number) {
  const out: string[] = [];
  let cursor = toMinutes(start);
  const endMinutes = toMinutes(end);

  while (cursor <= endMinutes) {
    out.push(toClockValue(cursor));
    cursor += stepMinutes;
  }

  return out;
}

function normalizeTimeValue(value: string) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return String(value || "").trim();
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toClockValue(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
