import { NextResponse } from "next/server";
import { requireUnsafeLocalDevRoute } from "@/lib/dev-route-guard";
import { sendSupabaseRecoveryEmail } from "@/lib/supabase-auth-email";
import { emailService } from "@/lib/email";

export async function POST(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) return blocked;

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    // Test 1: Supabase Auth SMTP (dashboard configured)
    const supabaseResult = await sendSupabaseRecoveryEmail(email, "/login");
    results.supabaseSmtp = supabaseResult;

    // Test 2: Direct nodemailer (requires SMTP_* env vars)
    const connectionTest = await emailService.testConnection();
    if (connectionTest.success) {
      const directResult = await emailService.sendEmail({
        to: email,
        subject: "ZamSchool SMTP Test Email",
        html: `<div style="font-family:sans-serif;padding:20px"><h1>Test Email</h1><p>If you received this, direct SMTP is working.</p></div>`,
        text: "Test Email - If you received this, direct SMTP is working.",
      });
      results.directSmtp = directResult;
    } else {
      results.directSmtp = { success: false, error: "SMTP not configured (no SMTP_* env vars)" };
    }

    const anySuccess = Object.values(results).some((r) => r.success);
    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? "At least one email method worked"
        : "All email methods failed",
      results,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) return blocked;

  return NextResponse.json({
    message: "Use POST to test email delivery",
    usage: { method: "POST", body: { email: "recipient@example.com" } },
    note: "Tests both Supabase SMTP (dashboard) and direct nodemailer (env vars).",
  });
}
