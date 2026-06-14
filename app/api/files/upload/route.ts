import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireActorContext } from "@/lib/server-auth";
import { applyRateLimit, safeErrorMessage } from "@/lib/server-guards";
import { uploadFile, buildKey } from "@/lib/r2-client";
import { validateFileUpload } from "@/lib/image-optimization";

/** Profile pictures use POST /api/account/avatar (Supabase), not this route. */
const ALLOWED_ENTITY_TYPES = ["assignment", "submission", "announcement", "receipt", "message", "document"] as const;

async function checkUploadRateLimit(userId: string): Promise<boolean> {
  const result = await applyRateLimit({
    key: `file_upload:${userId}`,
    limit: 20,
    windowMs: 60_000,
  });
  return result.allowed;
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireActorContext(
      { allowedRoles: ["ADMIN", "TEACHER", "STUDENT", "PARENT", "PAYMENTS"], requireSchool: true },
      req
    );
    if (!access.ok) return access.response;

    const allowed = await checkUploadRateLimit(access.context.userId);
    if (!allowed) {
      return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;

    if (!file || !entityType || !ALLOWED_ENTITY_TYPES.includes(entityType as any)) {
      return NextResponse.json({ error: "Invalid request. Provide a file and a valid entityType." }, { status: 400 });
    }

    const validation = validateFileUpload({ name: file.name, type: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const schoolId = access.context.schoolId || "default";
    const key = buildKey(schoolId, entityType, access.context.userId, file.name);

    const result = await uploadFile(key, buffer, { bucket: "uploads", contentType: file.type });

    return NextResponse.json({
      key: result.key,
      size: file.size,
      mimeType: file.type,
      originalName: file.name,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to upload file") },
      { status: 500 }
    );
  }
}
