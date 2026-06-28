import { format } from "date-fns";

import type { StudentResultRow } from "@/components/student/dashboard/types";

export function StudentPublishedResults({ results }: { results: StudentResultRow[] }) {
  return (
    <section
      aria-labelledby="student-results-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
        Published Results
      </p>
      <h2
        id="student-results-heading"
        className="mt-1 text-2xl font-semibold text-slate-900"
      >
        Academic records
      </h2>

      {results.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          No published results are available yet.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Assignment</th>
                <th className="px-3 py-3 font-medium">Subject</th>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium">Grade</th>
                <th className="px-3 py-3 font-medium">Published</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-3 py-3 text-slate-900">
                    {result.assignmentTitle}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{result.subjectName}</td>
                  <td className="px-3 py-3 text-slate-900">
                    {result.score == null ? "-" : result.score}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      {result.grade || "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {result.published_at
                      ? format(new Date(result.published_at), "MMM d, yyyy")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
