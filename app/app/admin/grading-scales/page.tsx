"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApiJson } from "@/lib/admin-browser-api";

type GradeRow = {
  id: string;
  level: number;
  name: string | null;
};

type ScaleRow = {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  grade: string;
  description: string | null;
};

export default function AdminGradingScalesPage() {
  const [loading, setLoading] = useState(true);
  const [savingGrade, setSavingGrade] = useState(false);
  const [savingScale, setSavingScale] = useState(false);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [scales, setScales] = useState<ScaleRow[]>([]);

  const [gradeForm, setGradeForm] = useState({ level: "", name: "" });
  const [scaleForm, setScaleForm] = useState({
    name: "",
    minScore: "",
    maxScore: "",
    grade: "",
    description: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [gradesBody, scalesBody] = await Promise.all([
        adminApiJson<{ data?: GradeRow[] }>("/api/admin/grades"),
        adminApiJson<{ data?: ScaleRow[] }>("/api/admin/grading-scales"),
      ]);

      setGrades(Array.isArray(gradesBody.data) ? gradesBody.data : []);
      setScales(Array.isArray(scalesBody.data) ? scalesBody.data : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load grades and scales");
      setGrades([]);
      setScales([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const addGrade = async () => {
    if (!gradeForm.level.trim()) {
      toast.error("Grade level is required");
      return;
    }

    const level = Number(gradeForm.level);
    if (!Number.isInteger(level) || level < 1 || level > 13) {
      toast.error("Grade level must be between 1 and 13");
      return;
    }

    setSavingGrade(true);
    const toastId = toast.loading("Creating grade...");
    try {
      await adminApiJson("/api/admin/grades", {
        method: "POST",
        body: JSON.stringify({
          level,
          name: gradeForm.name.trim() || undefined,
        }),
      });

      setGradeForm({ level: "", name: "" });
      await loadData();
      toast.success("Grade created", { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || "Failed to create grade", { id: toastId });
    } finally {
      setSavingGrade(false);
    }
  };

  const deleteGrade = async (id: string) => {
    if (!window.confirm("Delete this grade?")) return;
    const toastId = toast.loading("Deleting grade...");
    try {
      await adminApiJson(`/api/admin/grades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await loadData();
      toast.success("Grade deleted", { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete grade", { id: toastId });
    }
  };

  const addScale = async () => {
    const minScore = Number(scaleForm.minScore);
    const maxScore = Number(scaleForm.maxScore);

    if (!scaleForm.name.trim() || !scaleForm.grade.trim()) {
      toast.error("Scale name and grade are required");
      return;
    }

    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || minScore < 0 || maxScore < 0 || minScore > maxScore) {
      toast.error("Enter a valid score range");
      return;
    }

    setSavingScale(true);
    const toastId = toast.loading("Creating grading scale...");
    try {
      await adminApiJson("/api/admin/grading-scales", {
        method: "POST",
        body: JSON.stringify({
          name: scaleForm.name.trim(),
          minScore,
          maxScore,
          grade: scaleForm.grade.trim(),
          description: scaleForm.description.trim() || undefined,
        }),
      });

      setScaleForm({ name: "", minScore: "", maxScore: "", grade: "", description: "" });
      await loadData();
      toast.success("Grading scale created", { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || "Failed to create grading scale", { id: toastId });
    } finally {
      setSavingScale(false);
    }
  };

  const deleteScale = async (id: string) => {
    if (!window.confirm("Delete this grading scale?")) return;
    const toastId = toast.loading("Deleting grading scale...");
    try {
      await adminApiJson(`/api/admin/grading-scales?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await loadData();
      toast.success("Grading scale deleted", { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete grading scale", { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading grades and scales...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grades & Scales</h1>
        <p className="text-slate-500 mt-1">Create school grades first, then map them to score bands.</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Grades</h2>
            <span className="text-xs text-slate-500">{grades.length} total</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field
              label="Level"
              type="number"
              value={gradeForm.level}
              onChange={(value) => setGradeForm((prev) => ({ ...prev, level: value }))}
            />
            <Field
              label="Name"
              value={gradeForm.name}
              onChange={(value) => setGradeForm((prev) => ({ ...prev, name: value }))}
            />
          </div>

          <button
            onClick={addGrade}
            disabled={savingGrade}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:opacity-60"
          >
            {savingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Grade
          </button>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Level</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-slate-500">
                      No grades yet. Add the first one to unlock class setup.
                    </td>
                  </tr>
                ) : (
                  grades.map((grade) => (
                    <tr key={grade.id}>
                      <td className="px-3 py-3 font-medium text-slate-800">{grade.level}</td>
                      <td className="px-3 py-3 text-slate-600">{grade.name || `Grade ${grade.level}`}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => deleteGrade(grade.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center hover:bg-red-100"
                          aria-label={`Delete grade ${grade.level}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Grading Scales</h2>
            <span className="text-xs text-slate-500">{scales.length} total</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field
              label="Scale name"
              value={scaleForm.name}
              onChange={(value) => setScaleForm((prev) => ({ ...prev, name: value }))}
            />
            <Field
              label="Grade"
              value={scaleForm.grade}
              onChange={(value) => setScaleForm((prev) => ({ ...prev, grade: value }))}
            />
            <Field
              label="Min score"
              type="number"
              value={scaleForm.minScore}
              onChange={(value) => setScaleForm((prev) => ({ ...prev, minScore: value }))}
            />
            <Field
              label="Max score"
              type="number"
              value={scaleForm.maxScore}
              onChange={(value) => setScaleForm((prev) => ({ ...prev, maxScore: value }))}
            />
          </div>

          <Field
            label="Remarks"
            value={scaleForm.description}
            onChange={(value) => setScaleForm((prev) => ({ ...prev, description: value }))}
          />

          <button
            onClick={addScale}
            disabled={savingScale}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:opacity-60"
          >
            {savingScale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Scale
          </button>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Grade</th>
                  <th className="text-left px-3 py-2">Range</th>
                  <th className="text-left px-3 py-2">Scale</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-slate-500">
                      No grading scales yet. Create one after your grades are in place.
                    </td>
                  </tr>
                ) : (
                  scales.map((scale) => (
                    <tr key={scale.id}>
                      <td className="px-3 py-3 font-medium text-slate-800">{scale.grade}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {scale.min_score} - {scale.max_score}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{scale.name}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => deleteScale(scale.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center hover:bg-red-100"
                          aria-label={`Delete scale ${scale.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}
