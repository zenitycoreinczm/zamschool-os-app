import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonWithSchema,
  safeErrorMessage,
  validateRequestSecurity,
} from "@/lib/server-guards";
import {
  applyAuthApiRateLimit,
  authApiRateLimitResponse,
} from "@/lib/auth-api-rate-limit";
import {
  assertOtpRequestMatchesUser,
  OtpAuthError,
} from "@/lib/otp-request-auth";
import { readOtpToken, clearOtpToken } from "@/lib/temp-token-store";
import crypto from "crypto";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid(),
  otpCode: z.string().length(6),
});

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/** Confirm the user's email in Supabase Auth. */
async function markEmailConfirmed(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) {
    console.error("[verify-otp] email_confirm update failed:", error.message);
  }
}

export async function POST(req: Request) {
  try {
    const security = validateRequestSecurity(req);
    if (!security.valid) {
      return NextResponse.json({ error: security.error }, { status: 403 });
    }

    const { email, userId, otpCode } = await parseJsonWithSchema(
      req,
      verifyOtpSchema,
    );
    const normalizedEmail = email.toLowerCase();

    await assertOtpRequestMatchesUser(req, userId);

    const target = await loadOtpTarget(userId, normalizedEmail);

    const rate = await applyAuthApiRateLimit({
      scope: "verifyOtp",
      req,
      userId: target.userId,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    // Look up the hashed OTP from Redis (primary) or Postgres (fallback)
    const storedHash = await readOtpToken(target.userId);

    if (!storedHash) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 },
      );
    }

    const submittedHash = hashOtp(otpCode);
    if (submittedHash !== storedHash) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 },
      );
    }

    // Code matched — clear the used token and mark email confirmed
    await clearOtpToken(target.userId);
    await markEmailConfirmed(target.userId);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error: unknown) {
    if (error instanceof OtpAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(
      "Verify OTP error:",
      safeErrorMessage(error, "Unknown error"),
    );
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to verify code") },
      { status: 500 },
    );
  }
}

async function loadOtpTarget(userId: string, requestedEmail: string) {
  const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
  const resolvedEmail = String(lookup.data.user?.email || "")
    .trim()
    .toLowerCase();

  if (
    lookup.error ||
    !lookup.data.user ||
    !resolvedEmail ||
    resolvedEmail !== requestedEmail
  ) {
    throw new Error("Invalid verification request");
  }

  return {
    userId: lookup.data.user.id,
    email: resolvedEmail,
  };
}
