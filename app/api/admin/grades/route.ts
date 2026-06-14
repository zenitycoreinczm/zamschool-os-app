import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdminContext } from "@/lib/server-auth";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import {
  applyRateLimit,
  getClientIp,
  parseJsonWithSchema,
  safeErrorMessage,
} from "@/lib/server-guards";

const createGradeSchema = z.object({
  level: z.number().int().min(1).max(13),
  name: z.string().optional(),
});

const updateGradeSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(1).max(13).optional(),
  name: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;

    const { data, error } = await supabaseAdmin
      .from("grades")
      .select("*")
      .eq("school_id", access.context.schoolId)
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      if (isMissingGradesSchemaError(error)) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch grades") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "grades", "create");
    if (!perm.ok) return perm.response;

    const rate = await applyRateLimit({
      key: `admin-grades:${getClientIp(req)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, createGradeSchema);
    const payload = {
      school_id: access.context.schoolId,
      level: body.level,
      name: body.name?.trim() || `Grade ${body.level}`,
    };

    const { data, error } = await supabaseAdmin
      .from("grades")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (isMissingGradesSchemaError(error)) {
        return NextResponse.json(
          { error: "Grades are not configured in this database yet. Apply the live prerequisite migration to enable grade management." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Admin grades POST error", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create grade") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "grades", "update");
    if (!perm.ok) return perm.response;

    const rate = await applyRateLimit({
      key: `admin-grades:${getClientIp(req)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await parseJsonWithSchema(req, updateGradeSchema);
    const payload: Record<string, any> = {};
    if (body.level !== undefined) payload.level = body.level;
    if (body.name !== undefined) payload.name = body.name.trim() || null;

    const { data, error } = await supabaseAdmin
      .from("grades")
      .update(payload)
      .eq("id", body.id)
      .eq("school_id", access.context.schoolId)
      .select()
      .single();

    if (error) {
      if (isMissingGradesSchemaError(error)) {
        return NextResponse.json(
          { error: "Grades are not configured in this database yet. Apply the live prerequisite migration to enable grade management." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update grade") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdminContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "grades", "delete");
    if (!perm.ok) return perm.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Grade ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("grades")
      .delete()
      .eq("id", id)
      .eq("school_id", access.context.schoolId);

    if (error) {
      if (isMissingGradesSchemaError(error)) {
        return NextResponse.json(
          { error: "Grades are not configured in this database yet. Apply the live prerequisite migration to enable grade management." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to delete grade") },
      { status: 500 }
    );
  }
}

function isMissingGradesSchemaError(error: { code?: string | null; message?: string | null; details?: string | null } | null | undefined) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const details = String(error?.details || "");

  return (
    code === "PGRST205" ||
    code === "PGRST200" ||
    code === "42P01" ||
    message.includes("public.grades") ||
    message.includes("table 'public.grades'") ||
    message.includes("relation \"grades\" does not exist") ||
    details.includes("grades")
  );
}
