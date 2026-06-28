import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { feeUpdateSchema } from "@/lib/payment-input";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDomainWrite } from "@/lib/audit-domain";
import { getClientIp } from "@/lib/server-guards";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "payments.fees" });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(
      access.context,
      "payments",
      "update",
    );
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;

    const body = await request.json();
    const payload = feeUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedFee, error: feeError } = await supabaseAdmin
      .from("fees")
      .update(updateData)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (feeError) {
      log.error("fees.update_failed", { schoolId, feeId: id, error: feeError });
      return NextResponse.json(
        { error: "Failed to update fee" },
        { status: 500 },
      );
    }

    if (!updatedFee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    await auditDomainWrite({
      schoolId,
      userId: access.context.userId,
      action: "fee.updated",
      entityType: "fees",
      entityId: id,
      newData: { ...payload, updatedAt: updateData.updated_at },
      ipAddress: getClientIp(request),
    });

    log.info("fees.updated", { schoolId, feeId: id });
    return NextResponse.json({ data: updatedFee });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid fee submission", details: error.issues },
        { status: 400 },
      );
    }

    log.error("fees.put_unexpected", { feeId: id, error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(
      access.context,
      "payments",
      "delete",
    );
    if (!perm.ok) return perm.response;
    const { schoolId } = access.context;

    const { data: updatedFee, error: feeError } = await supabaseAdmin
      .from("fees")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (feeError) {
      log.error("fees.delete_failed", { schoolId, feeId: id, error: feeError });
      return NextResponse.json(
        { error: "Failed to delete fee" },
        { status: 500 },
      );
    }

    if (!updatedFee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    await auditDomainWrite({
      schoolId,
      userId: access.context.userId,
      action: "fee.deactivated",
      entityType: "fees",
      entityId: id,
      oldData: { wasActive: true },
      newData: { is_active: false },
      ipAddress: getClientIp(request),
    });

    log.info("fees.deactivated", { schoolId, feeId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("fees.delete_unexpected", { feeId: id, error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
