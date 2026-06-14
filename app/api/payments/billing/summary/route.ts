import { NextRequest, NextResponse } from "next/server";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    // Build base query for aggregates
    let baseQuery = supabaseAdmin
      .from("student_fees")
      .select("amount_due, amount_paid, student_id")
      .eq("school_id", schoolId);

    if (month) {
      baseQuery = baseQuery.eq("billing_month", month);
    }

    const { data: records, error: recordsError } = await baseQuery;

    if (recordsError) {
      console.error("Error fetching billing summary:", recordsError);
      return NextResponse.json(
        { error: "Failed to fetch billing summary" },
        { status: 500 }
      );
    }

    const rows = records || [];

    // Compute aggregates in memory
    let totalBilled = 0;
    let totalCollected = 0;
    const studentIds = new Set<string>();

    for (const row of rows) {
      totalBilled += Number(row.amount_due) || 0;
      totalCollected += Number(row.amount_paid) || 0;
      if (row.student_id) {
        studentIds.add(row.student_id);
      }
    }

    // Total outstanding (non-PAID, non-WAIVED)
    let outstandingQuery = supabaseAdmin
      .from("student_fees")
      .select("amount_due, amount_paid")
      .eq("school_id", schoolId)
      .not("status", "in", '("PAID","WAIVED")');

    if (month) {
      outstandingQuery = outstandingQuery.eq("billing_month", month);
    }

    const { data: outstandingRows, error: outstandingError } = await outstandingQuery;

    if (outstandingError) {
      console.error("Error fetching outstanding amounts:", outstandingError);
      return NextResponse.json(
        { error: "Failed to fetch billing summary" },
        { status: 500 }
      );
    }

    const totalOutstanding = (outstandingRows || []).reduce(
      (sum, row) => sum + (Number(row.amount_due) - Number(row.amount_paid)),
      0
    );

    // Overdue count (due_date < today and status not PAID/WAIVED)
    const todayStr = new Date().toISOString().split("T")[0];
    let overdueQuery = supabaseAdmin
      .from("student_fees")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .lt("due_date", todayStr)
      .not("status", "in", '("PAID","WAIVED")');

    if (month) {
      overdueQuery = overdueQuery.eq("billing_month", month);
    }

    const { count: overdueCount, error: overdueError } = await overdueQuery;

    if (overdueError) {
      console.error("Error fetching overdue count:", overdueError);
      return NextResponse.json(
        { error: "Failed to fetch billing summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total_billed: totalBilled,
      total_collected: totalCollected,
      total_outstanding: totalOutstanding,
      overdue_count: overdueCount || 0,
      student_count: studentIds.size,
      month: month || null,
    });
  } catch (error) {
    console.error("Error in billing summary GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
