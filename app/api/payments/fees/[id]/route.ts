import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { feeUpdateSchema } from "@/lib/payment-input";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDomainWrite } from "@/lib/audit-domain";
import { getClientIp } from "@/lib/server-guards";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;

    const { id } = await params;
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
      console.error("Error updating fee:", feeError);
      return NextResponse.json(
        { error: "Failed to update fee" },
        { status: 500 }
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

    return NextResponse.json({ data: updatedFee });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid fee submission", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in fee PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;

    const { id } = await params;

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
      console.error("Error deleting fee:", feeError);
      return NextResponse.json(
        { error: "Failed to delete fee" },
        { status: 500 }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in fee DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
