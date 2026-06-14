import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminContext } from "@/lib/server-auth";
import { applyRateLimit, getClientIp, parseJsonWithSchema, safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";

function generateAccessCode(): string {
  const bytes = randomBytes(4);
  // 6-digit numeric code
  const num = (bytes.readUInt32BE(0) % 900000) + 100000;
  return String(num);
}

const generateSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  schoolType: z.string().max(50).optional(),
  ownershipType: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const access = await requireSuperAdminContext(req);
    if (!access.ok) return access.response;

    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `generate-access-code:${ip}`,
      limit: 20,
      windowMs: 60_000,
      failOpen: true,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating more codes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const params = await parseJsonWithSchema(req, generateSchema);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);

    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateAccessCode();
      const { data: existing } = await supabaseAdmin
        .from("access_codes")
        .select("code")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique code. Please try again." },
        { status: 500 },
      );
    }

    const { error } = await supabaseAdmin.from("access_codes").insert({
      code,
      created_by: access.context.userId,
      max_uses: params.maxUses,
      use_count: 0,
      expires_at: expiresAt.toISOString(),
      province: params.province || null,
      district: params.district || null,
      school_type: params.schoolType || null,
      ownership_type: params.ownershipType || null,
      notes: params.notes || null,
    });

    if (error) {
      console.error("[generate-access-code] DB error:", error);
      return NextResponse.json(
        { error: "Failed to create access code." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
        maxUses: params.maxUses,
      },
    });
  } catch (err: unknown) {
    console.error("[generate-access-code] Error:", safeErrorMessage(err, "Unknown error"));
    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to generate access code.") },
      { status: 500 },
    );
  }
}