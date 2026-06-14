import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit-log";
import { requireActorContext } from "@/lib/server-auth";
import { getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";

const departmentSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  head_of_department: z.string().uuid().optional().nullable(),
});

const updateDepartmentSchema = departmentSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: ["PRINCIPAL", "DEPUTY_HEAD", "HR_ADMIN", "ACADEMIC_ADMIN", "ADMIN", "SUPER_ADMIN"],
      requireSchool: true,
    },
    req
  );
  if (!access.ok) return access.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("school_departments")
      .select("id, name, description, head_of_department, is_default, created_at, updated_at")
      .eq("school_id", access.context.schoolId)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err, "Failed to load departments") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: ["PRINCIPAL", "ADMIN", "SUPER_ADMIN"],
      requireSchool: true,
    },
    req
  );
  if (!access.ok) return access.response;

  try {
    const body = await parseJsonWithSchema(req, departmentSchema);
    const { data, error } = await supabaseAdmin
      .from("school_departments")
      .insert({
        school_id: access.context.schoolId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        head_of_department: body.head_of_department || null,
        is_default: false,
      })
      .select("id, name, description, head_of_department, is_default, created_at, updated_at")
      .single();

    if (error) throw error;

    await createAuditLog({
      schoolId: access.context.schoolId,
      userId: access.context.userId,
      action: "department.created",
      entityType: "school_department",
      entityId: data.id,
      newData: { name: data.name },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err, "Failed to create department") }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: ["PRINCIPAL", "ADMIN", "SUPER_ADMIN"],
      requireSchool: true,
    },
    req
  );
  if (!access.ok) return access.response;

  try {
    const body = await parseJsonWithSchema(req, updateDepartmentSchema);
    const { id, ...updates } = body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("school_departments")
      .select("id, name, description, head_of_department, is_default")
      .eq("id", id)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.head_of_department !== undefined) payload.head_of_department = updates.head_of_department;

    const { data, error } = await supabaseAdmin
      .from("school_departments")
      .update(payload)
      .eq("id", id)
      .eq("school_id", access.context.schoolId)
      .select("id, name, description, head_of_department, is_default, created_at, updated_at")
      .single();

    if (error) throw error;

    await createAuditLog({
      schoolId: access.context.schoolId,
      userId: access.context.userId,
      action: "department.updated",
      entityType: "school_department",
      entityId: id,
      oldData: existing,
      newData: data,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err, "Failed to update department") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireActorContext(
    {
      allowedRoles: ["PRINCIPAL", "ADMIN", "SUPER_ADMIN"],
      requireSchool: true,
    },
    req
  );
  if (!access.ok) return access.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Department id is required" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("school_departments")
      .select("id, name, is_default")
      .eq("id", id)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (existing.is_default) {
      return NextResponse.json({ error: "Default departments cannot be deleted" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("school_departments")
      .delete()
      .eq("id", id)
      .eq("school_id", access.context.schoolId);

    if (error) throw error;

    await createAuditLog({
      schoolId: access.context.schoolId,
      userId: access.context.userId,
      action: "department.deleted",
      entityType: "school_department",
      entityId: id,
      oldData: existing,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeErrorMessage(err, "Failed to delete department") }, { status: 500 });
  }
}
