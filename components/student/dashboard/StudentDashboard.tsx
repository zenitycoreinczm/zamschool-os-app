"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import Announcements from "@/components/Announcements";
import { AssignmentSubmissionDialog } from "@/components/student/dashboard/AssignmentSubmissionDialog";
import { StudentAttendanceStats } from "@/components/student/dashboard/StudentAttendanceStats";
import { StudentDashboardHero } from "@/components/student/dashboard/StudentDashboardHero";
import { StudentPublishedResults } from "@/components/student/dashboard/StudentPublishedResults";
import { StudentTodayLessons } from "@/components/student/dashboard/StudentTodayLessons";
import { StudentUpcomingAssignments } from "@/components/student/dashboard/StudentUpcomingAssignments";
import {
  getEmptyAttendanceSummary,
} from "@/components/student/dashboard/format";
import type { StudentAssignmentRow } from "@/components/student/dashboard/types";
import { useStudentDashboard } from "@/components/student/dashboard/useStudentDashboard";

export default function StudentDashboard() {
  const {
    dashboard,
    results,
    loading,
    refreshing,
    error,
    refresh,
    submitAssignment,
  } = useStudentDashboard();

  const [selectedAssignment, setSelectedAssignment] =
    useState<StudentAssignmentRow | null>(null);

  const openSubmissionDialog = (assignment: StudentAssignmentRow) => {
    setSelectedAssignment(assignment);
  };

  const closeSubmissionDialog = () => {
    setSelectedAssignment(null);
  };

  if (loading) {
    return (
      <div
        className="flex-1 p-4 md:p-6"
        role="status"
        aria-live="polite"
      >
        <section className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mb-3 h-5 w-5 animate-spin" />
          Loading student dashboard...
        </section>
      </div>
    );
  }

  const summary = dashboard?.attendance.summary || getEmptyAttendanceSummary();

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <StudentDashboardHero
        displayName={dashboard?.profile.fullName || "Student"}
        className={dashboard?.profile.className || "Class pending"}
        admissionNumber={dashboard?.profile.admissionNumber || null}
        refreshing={refreshing}
        error={error}
        onRefresh={() => void refresh()}
      />

      <StudentAttendanceStats summary={summary} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-6">
          <StudentTodayLessons lessons={dashboard?.todayLessons || []} />

          <StudentUpcomingAssignments
            assignments={dashboard?.assignments.rows || []}
            onSubmit={openSubmissionDialog}
          />

          <StudentPublishedResults results={results} />
        </div>

        <div className="space-y-6">
          <Announcements />
        </div>
      </div>

      <AssignmentSubmissionDialog
        assignment={selectedAssignment}
        onClose={closeSubmissionDialog}
        onSaved={() => submitAssignment(selectedAssignment as StudentAssignmentRow)}
      />
    </div>
  );
}
