import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireFeatureAccess } from "@/lib/feature-permissions";
import { requirePaymentsContext } from "@/lib/server-auth";
import { parseManualPaymentInput } from "@/lib/payment-input";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDomainWrite } from "@/lib/audit-domain";
import { getClientIp } from "@/lib/server-guards";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studentFeeId: string }> },
) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(
      access.context,
      "payments",
      "update",
    );
    if (!perm.ok) return perm.response;
    const { schoolId, userId } = access.context;

    const { studentFeeId } = await params;

    const { amount, paymentMethod, referenceNumber } = parseManualPaymentInput(
      await request.json(),
    );

    const { data: transactionResult, error: paymentError } =
      await supabaseAdmin.rpc("record_student_fee_payment_transaction", {
        p_school_id: schoolId,
        p_student_fee_id: studentFeeId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_reference_number: referenceNumber,
        p_created_by: userId,
      });

    if (paymentError) {
      if (paymentError.message.includes("Student fee record not found")) {
        return NextResponse.json(
          { error: "Student fee record not found" },
          { status: 404 },
        );
      }

      console.error("Error recording payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 },
      );
    }

    const payload = (transactionResult || {}) as {
      student_fee?: { student_id?: string | null };
      payment?: { id?: string | null };
      previous_status?: string | null;
      new_status?: string | null;
      previous_amount_paid?: number | string | null;
      new_amount_paid?: number | string | null;
    };
    const updatedFee = payload.student_fee;

    if (!updatedFee?.student_id) {
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 },
      );
    }

    await auditDomainWrite({
      schoolId,
      userId,
      action: "payment.recorded",
      entityType: "payments",
      entityId: payload.payment?.id || undefined,
      newData: {
        studentFeeId,
        studentId: updatedFee.student_id,
        amount,
        paymentMethod,
        referenceNumber,
        previousStatus: payload.previous_status,
        newStatus: payload.new_status,
        previousAmountPaid: Number(payload.previous_amount_paid || 0),
        newAmountPaid: Number(payload.new_amount_paid || 0),
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data: updatedFee });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payment submission", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Error in billing manual payment PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
