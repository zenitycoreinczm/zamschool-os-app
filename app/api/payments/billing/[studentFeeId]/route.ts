import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePaymentsContext } from "@/lib/server-auth";
import { parseManualPaymentInput } from "@/lib/payment-input";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDomainWrite } from "@/lib/audit-domain";
import { getClientIp } from "@/lib/server-guards";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studentFeeId: string }> }
) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;

    const { studentFeeId } = await params;

    const { amount, paymentMethod, referenceNumber } = parseManualPaymentInput(
      await request.json()
    );

    // Fetch the student_fee record
    const { data: studentFee, error: fetchError } = await supabaseAdmin
      .from("student_fees")
      .select("*")
      .eq("id", studentFeeId)
      .eq("school_id", schoolId)
      .single();

    if (fetchError || !studentFee) {
      return NextResponse.json(
        { error: "Student fee record not found" },
        { status: 404 }
      );
    }

    // Calculate new amounts and status
    const currentPaid = Number(studentFee.amount_paid) || 0;
    const amountDue = Number(studentFee.amount_due) || 0;
    const newAmountPaid = currentPaid + amount;

    let newStatus: "PENDING" | "PARTIAL" | "PAID" | "WAIVED";
    if (newAmountPaid >= amountDue) {
      newStatus = "PAID";
    } else if (newAmountPaid > 0) {
      newStatus = "PARTIAL";
    } else {
      newStatus = "PENDING";
    }

    const paidAt = newStatus === "PAID" ? new Date().toISOString() : studentFee.paid_at;

    // Update student_fees record
    const { data: updatedFee, error: updateError } = await supabaseAdmin
      .from("student_fees")
      .update({
        amount_paid: newAmountPaid,
        status: newStatus,
        paid_at: paidAt,
      })
      .eq("id", studentFeeId)
      .eq("school_id", schoolId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating student fee:", updateError);
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 }
      );
    }

    // Insert payment record
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        school_id: schoolId,
        student_id: studentFee.student_id,
        amount,
        currency: "ZMW",
        payment_type: "tuition",
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        status: "PAID",
        paid_at: new Date().toISOString(),
        created_by: userId,
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    await auditDomainWrite({
      schoolId,
      userId,
      action: "payment.recorded",
      entityType: "payments",
      newData: {
        studentFeeId,
        studentId: studentFee.student_id,
        amount,
        paymentMethod,
        referenceNumber,
        previousStatus: studentFee.status,
        newStatus,
        previousAmountPaid: currentPaid,
        newAmountPaid,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ data: updatedFee });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payment submission", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error in billing manual payment PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
