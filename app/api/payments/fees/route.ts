import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { feeSchema } from "@/lib/payment-input";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId } = access.context;

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    let query = supabaseAdmin
      .from("fees")
      .select("*")
      .eq("school_id", schoolId);

    if (active === "true") {
      query = query.eq("is_active", true);
    }

    const { data: fees, error: feesError } = await query.order("created_at", {
      ascending: false,
    });

    if (feesError) {
      console.error("Error fetching fees:", feesError);
      return NextResponse.json(
        { error: "Failed to fetch fees" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fees || [] });
  } catch (error) {
    console.error("Error in fees GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;

    const body = await request.json();
    const payload = feeSchema.parse(body);

    const { data: newFee, error: feeError } = await supabaseAdmin
      .from("fees")
      .insert({
        school_id: schoolId,
        name: payload.name,
        description: payload.description,
        amount: payload.amount,
        currency: payload.currency,
        frequency: payload.frequency,
        created_by: userId,
      })
      .select()
      .single();

    if (feeError) {
      console.error("Error creating fee:", feeError);
      return NextResponse.json(
        { error: "Failed to create fee" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newFee }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid fee submission", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in fees POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
