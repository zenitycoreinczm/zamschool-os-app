import { NextResponse } from "next/server";

import { requireParentContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyEdgeCacheHeaders } from "@/lib/edge-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getParentRecord, getLinkedStudents, buildDisplayName } from "@/lib/parent-route-utils";

export async function GET(req: Request) {
  try {
    const access = await requireParentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const parentRecord = await getParentRecord({ profileId: userId, schoolId });
    if (!parentRecord) {
      return jsonResponse({ success: true, data: [] });
    }

    const linked = await getLinkedStudents({
      parentRecordId: parentRecord.id,
      parentProfileId: userId,
      schoolId,
      includeRowMappings: true,
    });

    if (linked.profileIds.length === 0) {
      return jsonResponse({ success: true, data: [] });
    }

    const scopedStudentRowIds = linked.profileIds
      .map((profileId) => linked.studentRowIdByProfileId?.get(profileId))
      .filter(Boolean) as string[];

    const profileIdByStudentRowId = linked.profileIdByStudentRowId;

    const { data: absenceRows, error: absenceError } = await supabaseAdmin
      .from("attendance")
      .select("id, student_id, date, status, remarks, notes, recorded_by, created_at")
      .eq("school_id", schoolId)
      .in("student_id", scopedStudentRowIds)
      .eq("status", "ABSENT")
      .order("date", { ascending: false })
      .limit(100);

    if (absenceError) throw absenceError;

    const studentProfileIds = Array.from(new Set(
      (absenceRows || []).map((row: any) => profileIdByStudentRowId?.get(row.student_id)).filter(Boolean)
    ));
    const { data: profiles } = studentProfileIds.length > 0
      ? await supabaseAdmin.from("profiles").select("id, first_name, last_name").in("id", studentProfileIds)
      : { data: [] };

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    const data = (absenceRows || []).map((row: any) => {
      const profileId = profileIdByStudentRowId?.get(row.student_id);
      const profile = profileById.get(profileId || "");
      return {
        id: row.id,
        studentId: profileId || row.student_id,
        studentName: buildDisplayName(profile || {}),
        date: row.date,
        status: row.status,
        remarks: row.remarks || row.notes || null,
        recordedBy: row.recorded_by,
        createdAt: row.created_at,
      };
    });

    return jsonResponse({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load absence records") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireParentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, date, reason } = body;

    if (!studentId || !date || !reason) {
      return NextResponse.json(
        { error: "studentId, date, and reason are required" },
        { status: 400 }
      );
    }

    const parentRecord = await getParentRecord({ profileId: userId, schoolId });
    if (!parentRecord) {
      return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
    }

    const linked = await getLinkedStudents({
      parentRecordId: parentRecord.id,
      parentProfileId: userId,
      schoolId,
      includeRowMappings: true,
    });

    const studentProfileId = linked.profileIds.find((id) => id === studentId);
    if (!studentProfileId) {
      return NextResponse.json(
        { error: "Requested child is not linked to this parent account" },
        { status: 403 }
      );
    }

    const studentRowId = linked.studentRowIdByProfileId?.get(studentProfileId);
    if (!studentRowId) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("attendance")
      .select("id")
      .eq("school_id", schoolId)
      .eq("student_id", studentRowId)
      .eq("date", date)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("attendance")
        .update({ notes: reason, remarks: reason })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("attendance")
        .insert({
          school_id: schoolId,
          student_id: studentRowId,
          date,
          status: "EXCUSED",
          notes: reason,
          remarks: reason,
          recorded_by: userId,
        });

      if (insertError) throw insertError;
    }

    return jsonResponse({ success: true, message: "Absence justification submitted" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to submit absence justification") },
      { status: 500 }
    );
  }
}

function jsonResponse(payload: unknown) {
  return applyEdgeCacheHeaders(NextResponse.json(payload), "noStore");
}
