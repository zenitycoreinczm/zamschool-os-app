import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeErrorMessage } from "@/lib/server-guards";
import { applyAuthApiRateLimit, authApiRateLimitResponse } from "@/lib/auth-api-rate-limit";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rate = await applyAuthApiRateLimit({
      scope: "mfaEnroll",
      req,
      userId: user.id,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "ZamSchool OS",
      friendlyName: `ZamSchool - ${user.email ?? "User"}`,
    });

    if (error) throw error;

    if (!data?.id || !data?.totp?.qr_code || !data?.totp?.secret) {
      return NextResponse.json(
        { error: "MFA enrollment returned incomplete data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        factorId: data.id,
        qrCodeUrl: data.totp.qr_code,
        secret: data.totp.secret,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to start MFA enrollment") },
      { status: 500 }
    );
  }
}