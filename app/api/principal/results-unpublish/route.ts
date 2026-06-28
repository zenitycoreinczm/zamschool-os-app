import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePrincipalOverrideContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import {
  parseJsonWithSchema,
  safeErrorMessage,
  getClientIp,
} from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDomainWrite } from "@/lib/audit-domain";
import { invalidatePublishedResultsCache } from "@/lib/published-results-read";

const unpublishSchema = z
  .object({
    assignmentId: z.string().uuid().optional(),
    resultIds: z.array(z.string().uuid()).min(1).optional(),
    examTitle: z.string().optional(),
    classId: z.string().uuid().optional(),
    reason: z.string().min(1, "Reason is required").max(500),
  })
  .refine(
    (value) =>
      value.assignmentId ||
      value.resultIds?.length ||
      (value.examTitle && value.classId),
    {
      message: "assignmentId, resultIds, or examTitle+classId is required",
    },
  );

export async function POST(req: Request) {
  try {
    const access = await requirePrincipalOverrideContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(
      access.context,
      "overrides",
      "update",
    );
    if (!perm.ok) return perm.response;

    const { userId, schoolId } = access.context;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this account" },
        { status: 403 },
      );
    }

    const body = await parseJsonWithSchema(req, unpublishSchema);

    let query = supabaseAdmin
      .from("results")
      .select("id, student_id, assignment_id, published_at")
      .eq("school_id", schoolId)
      .not("published_at", "is", null);

    if (body.examTitle && body.classId) {
      const { data: examAssignments } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .eq("school_id", schoolId)
        .eq("class_id", body.classId)
        .eq("title", body.examTitle);

      const examAssignmentIds = (examAssignments || []).map((a: any) => a.id);
      if (examAssignmentIds.length === 0) {
        return NextResponse.json(
          { error: "No assignments found for this exam and class" },
          { status: 404 },
        );
      }
      query = query.in("assignment_id", examAssignmentIds);
    } else if (body.assignmentId) {
      query = query.eq("assignment_id", body.assignmentId);
    } else if (body.resultIds?.length) {
      query = query.in("id", body.resultIds);
    }

    const { data: publishedResults, error: queryError } = await query;
    if (queryError) throw queryError;

    if (!publishedResults || publishedResults.length === 0) {
      return NextResponse.json(
        { error: "No published results found to unpublish" },
        { status: 404 },
      );
    }

    const resultIds = publishedResults.map((r: any) => r.id);

    const { error: unpublishError } = await supabaseAdmin
      .from("results")
      .update({
        published_at: null,
        published_by: null,
      })
      .in("id", resultIds)
      .eq("school_id", schoolId);

    if (unpublishError) throw unpublishError;

    await auditDomainWrite({
      schoolId,
      userId,
      action: "results.unpublished",
      entityType: "results",
      newData: {
        unpublishCount: resultIds.length,
        reason: body.reason,
        assignmentId: body.assignmentId || null,
        examTitle: body.examTitle || null,
        classId: body.classId || null,
      },
      ipAddress: getClientIp(req),
    });

    await invalidatePublishedResultsCache();

    return NextResponse.json({
      success: true,
      data: {
        unpublishCount: resultIds.length,
        reason: body.reason,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to unpublish results") },
      { status: 500 },
    );
  }
}
