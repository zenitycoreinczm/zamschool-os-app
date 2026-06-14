import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyAuthApiRateLimit, authApiRateLimitResponse } from "@/lib/auth-api-rate-limit";

const verifySchema = z.object({
  factorId: z.string().min(1, "factorId is required"),
  challengeId: z.string().min(1, "challengeId is required"),
  code: z.string().min(1, "TOTP code is required"),
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
      scope: "mfaVerify",
      req,
      userId: user.id,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { factorId, challengeId, code } = parsed.data;
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (error) throw error;

    await supabase.auth.getUser();

    if (data) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...(user.app_metadata as Record<string, unknown>),
          mfa_enrolled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { verified: true },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "MFA verification failed") },
      { status: 500 }
    );
  }
}