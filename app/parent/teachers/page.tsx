"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Surface } from "@/components/workspace/Surface";
import { WorkspaceLoader } from "@/components/workspace/WorkspaceLoader";
import { Users, Mail, Phone, BookOpen, GraduationCap } from "lucide-react";

type Teacher = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subjects: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
};

export default function ParentTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const load = async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/parent/teachers", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const body = await res.json();
        setTeachers(body.data ?? []);
      } else {
        setError("Failed to load teachers");
      }
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) return <WorkspaceLoader label="Loading teachers" />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Teachers</h1>
        <p className="text-sm text-slate-500">Teachers assigned to your children&apos;s classes</p>
      </div>

      {error ? (
        <Surface variant="elevated" className="p-6 text-center">
          <p className="text-sm text-rose-600">{error}</p>
        </Surface>
      ) : teachers.length === 0 ? (
        <Surface variant="elevated" className="p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No teachers found for your children&apos;s classes.</p>
        </Surface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Surface key={teacher.id} variant="elevated" className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {teacher.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{teacher.name}</p>
                  {teacher.email && (
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      {teacher.email}
                    </p>
                  )}
                  {teacher.phone && (
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" />
                      {teacher.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {teacher.subjects.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{teacher.subjects.map((s) => s.name).join(", ")}</span>
                  </div>
                )}
                {teacher.classes.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{teacher.classes.map((c) => c.name).join(", ")}</span>
                  </div>
                )}
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
