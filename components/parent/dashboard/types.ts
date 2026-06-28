export type AttendanceSummary = {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
};

export const DEFAULT_ATTENDANCE_SUMMARY: AttendanceSummary = {
  PRESENT: 0,
  ABSENT: 0,
  LATE: 0,
  EXCUSED: 0,
};

export type ParentChildRow = {
  id: string;
  displayName: string;
  admissionNumber: string | null;
  classId: string | null;
  className: string;
  relationship: string | null;
  email?: string | null;
  summary?: AttendanceSummary;
};

export type ParentAttendanceRow = {
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

export type ParentAttendanceData = {
  range: string;
  startDate: string;
  endDate: string;
  summary: AttendanceSummary;
  children: ParentChildRow[];
  rows: ParentAttendanceRow[];
};

export type ParentResultRow = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  subjectName: string;
  className: string;
  score: number | null;
  grade: string | null;
  publishedAt: string | null;
};

export type ParentChildrenResponse = {
  success?: boolean;
  data?: ParentChildRow[];
  error?: string;
};

export type ParentAttendanceResponse = {
  success?: boolean;
  data?: ParentAttendanceData;
  error?: string;
};

export type ParentResultsResponse = {
  success?: boolean;
  data?: ParentResultRow[];
  error?: string;
};

export type ParentRangeOption = {
  value: "1w" | "1m" | "3m" | "6m" | "1y" | "3y";
  label: string;
};

export const RANGE_OPTIONS: ParentRangeOption[] = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
];

export type ParentRangeValue = ParentRangeOption["value"];

export const ALL_CHILDREN_ID = "all";
