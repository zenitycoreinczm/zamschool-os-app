import { NextResponse } from "next/server";

import { requireFeatureAccess } from "@/lib/feature-permissions";
import { safeErrorMessage } from "@/lib/server-guards";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { READ_MOSTLY_PRIVATE_CACHE } from "@/lib/teacher-route-common";

export async function GET(req: Request) {
  try {
    const access = await requirePaymentsContext(req);
    if (!access.ok) return access.response;
    const perm = await requireFeatureAccess(access.context, "payments", "read");
    if (!perm.ok) return perm.response;

    const schoolId = access.context.schoolId;
    if (!schoolId) {
      return NextResponse.json({
        success: true,
        data: {
          totalRevenue: 0,
          pendingPayments: 0,
          overduePayments: 0,
          totalStudents: 0,
        },
      });
    }

    const [paymentsResult, studentCountResult] = await Promise.all([
      supabaseAdmin
        .from("payments")
        .select("amount, status")
        .eq("school_id", schoolId),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("role", "STUDENT"),
    ]);

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    const payments = paymentsResult.data || [];
    const totalRevenue = payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const pendingPayments = payments
      .filter((payment) => payment.status === "PENDING")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const response = NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        pendingPayments,
        overduePayments: 0,
        totalStudents: studentCountResult.count || 0,
      },
    });

    response.headers.set("Cache-Control", READ_MOSTLY_PRIVATE_CACHE);
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load payments summary") },
      { status: 500 },
    );
  }
}
