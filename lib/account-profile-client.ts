import { fetchGatewayRead } from "@/lib/gateway-read-client";

export type AccountProfilePayload = {
  success?: boolean;
  data?: {
    profile?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      avatar_url?: string;
      role?: string;
      status?: string;
    } | null;
    firstLogin?: {
      mustChangePassword?: boolean;
      temporaryPasswordIssuedAt?: string | null;
    } | null;
    teacher?: {
      employeeId?: string | null;
      department?: string | null;
      specialization?: string | null;
      hireDate?: string | null;
      tenure?: { label?: string | null; days?: number | null } | null;
      specializationSubjectIds?: string[];
      teachingAssignments?: Array<{
        classId: string;
        className: string;
        subjectId: string;
        subjectName: string;
      }>;
      supervisedClassIds?: string[];
      assignedClasses?: Array<{ id: string; name: string }>;
      assignedSubjects?: Array<{ id: string; name: string }>;
      supervisedClasses?: Array<{ id: string; name: string }>;
      oversight?: {
        stats?: {
          supervisedClasses?: number;
          teachingClasses?: number;
          weeklyLessons?: number;
          pendingRollCalls?: number;
          completedRollCalls?: number;
          todayLessons?: number;
        };
        recentAssignments?: Array<{
          id?: string | null;
          title?: string | null;
          className?: string | null;
          dueDate?: string | null;
        }>;
        recentAttendance?: Array<{
          id?: string | null;
          sessionName?: string | null;
          date?: string | null;
          status?: string | null;
        }>;
        recentResults?: Array<{
          id?: string | null;
          studentName?: string | null;
          subjectName?: string | null;
          score?: number | null;
          grade?: string | null;
        }>;
      } | null;
      pendingRollCalls?: number;
    } | null;
  } | null;
  error?: string;
};

export async function fetchAccountProfile() {
  const response = await fetchGatewayRead("/api/account/profile", {
    cache: "no-store",
    fallbackToLocal: true,
  });
  const payload = (await response.json()) as AccountProfilePayload;

  if (!response.ok) {
    throw new Error(payload.error || "Failed to load account profile");
  }

  return payload;
}
