import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyAuthApiRateLimit, authApiRateLimitResponse } from "@/lib/auth-api-rate-limit";

const challengeSchema = z.object({
  factorId: z.string().min(1, "factorId is required"),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rate = await applyAuthApiRateLimit({
      scope: "mfaChallenge",
      req,
      userId: user.id,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const body = await req.json();
    const parsed = challengeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: parsed.data.factorId,
    });

    if (error) throw error;

    const challengeId = data?.id;
    if (!challengeId) {
      return NextResponse.json({ error: "No challenge ID returned" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        challengeId,
        expiresAt: data.expires_at ?? Date.now() + 60_000,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create MFA challenge") },
      { status: 500 }
    );
  }
}