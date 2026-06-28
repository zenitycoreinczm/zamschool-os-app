import { CheckCircle2, Clock3, UserSquare2, XCircle } from "lucide-react";

import { StudentStatCard } from "@/components/student/dashboard/StudentStatCard";
import type { StudentAttendanceSummary } from "@/components/student/dashboard/types";

export function StudentAttendanceStats({
  summary,
}: {
  summary: StudentAttendanceSummary;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StudentStatCard
        label="Present"
        value={String(summary.PRESENT)}
        icon={CheckCircle2}
        tone="emerald"
      />
      <StudentStatCard
        label="Absent"
        value={String(summary.ABSENT)}
        icon={XCircle}
        tone="rose"
      />
      <StudentStatCard label="Late" value={String(summary.LATE)} icon={Clock3} tone="amber" />
      <StudentStatCard
        label="Attendance Rate"
        value={`${summary.rate}%`}
        icon={UserSquare2}
        tone="sky"
      />
    </div>
  );
}
