"use client";

type AttendanceRow = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  studentId: string;
  studentName: string;
  admissionNumber: string | null;
  lessonId: string | null;
  subjectName: string;
  subjectCode: string | null;
  classId: string | null;
  className: string;
  teacherName: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
};

export default function ParentChildAttendanceTable({
  rows,
}: {
  rows: AttendanceRow[];
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        No lesson attendance records were found for the selected window.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
          Lesson History
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Detailed attendance log
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Child</th>
              <th className="px-6 py-4">Lesson</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="align-top text-sm text-slate-600">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{formatDate(row.date)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTimeRange(row.startTime, row.endTime)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{row.studentName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.admissionNumber || "No admission number"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{row.subjectName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.subjectCode || "Subject"}{row.room ? ` | Room ${row.room}` : ""}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{row.className}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{row.teacherName}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={statusBadge(row.status)}>{formatStatus(row.status)}</span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {row.remarks || "No remarks recorded."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusBadge(status: AttendanceRow["status"]) {
  if (status === "PRESENT") {
    return "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
  }
  if (status === "ABSENT") {
    return "inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";
  }
  if (status === "LATE") {
    return "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
  }
  return "inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700";
}

function formatStatus(value: AttendanceRow["status"]) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) {
    return "Time not set";
  }

  if (startTime && endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  return formatTime(startTime || endTime || "");
}

function formatTime(value: string) {
  const [hoursText = "0", minutesText = "00"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
