import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStudentContext } from "@/lib/server-auth";
import {
  applyRateLimit,
  getClientIp,
  safeErrorMessage,
} from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

const submissionSchema = z
  .object({
    assignmentId: z.string().uuid("Valid assignment ID is required"),
    submissionText: z.string().trim().max(4000).optional().nullable(),
    submissionLink: z.string().trim().url("Submission link must be a valid URL").max(500).optional().nullable(),
    submissionFileUrl: z.string().optional().nullable(),
    submissionFileName: z.string().optional().nullable(),
  })
  .refine(
    (value) => Boolean(
      String(value.submissionText || "").trim() ||
      String(value.submissionLink || "").trim() ||
      String(value.submissionFileUrl || "").trim()
    ),
    {
      message: "Add submission text, a link, or a file before saving.",
      path: ["submissionText"],
    }
  );

export async function POST(req: Request) {
  try {
    const access = await requireStudentContext(req);
    if (!access.ok) return access.response;
    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `student-assignment-submissions:${userId}:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const parsedBody = submissionSchema.parse(await req.json());
    const studentClassId = await loadStudentClassId(userId, schoolId);
    if (!studentClassId) {
      return NextResponse.json(
        { error: "No class is linked to this student account" },
        { status: 403 }
      );
    }

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select("id, class_id, school_id")
      .eq("id", parsedBody.assignmentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.class_id !== studentClassId) {
      return NextResponse.json(
        { error: "Forbidden - assignment access denied" },
        { status: 403 }
      );
    }

    const { data: existingSubmission, error: existingSubmissionError } = await supabaseAdmin
      .from("assignment_submissions")
      .select("id, submitted_at")
      .eq("school_id", schoolId)
      .eq("assignment_id", parsedBody.assignmentId)
      .eq("student_profile_id", userId)
      .maybeSingle();

    if (existingSubmissionError) throw existingSubmissionError;

    const nowIso = new Date().toISOString();
    const { data: savedSubmission, error: saveError } = await supabaseAdmin
      .from("assignment_submissions")
      .upsert(
        {
          id: existingSubmission?.id || undefined,
          school_id: schoolId,
          assignment_id: parsedBody.assignmentId,
          student_profile_id: userId,
          submission_text: normalizeOptionalText(parsedBody.submissionText),
          submission_link: normalizeOptionalText(parsedBody.submissionLink),
          submission_file_url: normalizeOptionalText(parsedBody.submissionFileUrl),
          submission_file_name: normalizeOptionalText(parsedBody.submissionFileName),
          submitted_at: existingSubmission?.submitted_at || nowIso,
          updated_at: nowIso,
        },
        { onConflict: "school_id,assignment_id,student_profile_id" }
      )
      .select("id, assignment_id, student_profile_id, submission_text, submission_link, submission_file_url, submission_file_name, submitted_at, updated_at")
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({
      success: true,
      data: {
        id: savedSubmission.id,
        assignmentId: savedSubmission.assignment_id,
        studentProfileId: savedSubmission.student_profile_id,
        submissionText: savedSubmission.submission_text || "",
        submissionLink: savedSubmission.submission_link || null,
        submissionFileUrl: savedSubmission.submission_file_url || null,
        submissionFileName: savedSubmission.submission_file_name || null,
        submittedAt: savedSubmission.submitted_at || null,
        updatedAt: savedSubmission.updated_at || null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to save assignment submission") },
      { status: 500 }
    );
  }
}

async function loadStudentClassId(profileId: string, schoolId: string) {
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("class_id")
    .eq("id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (!profileResult.error && profileResult.data?.class_id) {
    return profileResult.data.class_id;
  }

  const studentResult = await supabaseAdmin
    .from("students")
    .select("class_id")
    .eq("profile_id", profileId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (studentResult.error) throw studentResult.error;
  return studentResult.data?.class_id || null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized || null;
}
