import { NextRequest, NextResponse } from "next/server";

import { requireActorContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { deleteFile } from "@/lib/r2-client";

export async function POST(req: NextRequest) {
  try {
    const access = await requireActorContext(
      { allowedRoles: ["ADMIN", "TEACHER", "PAYMENTS"], requireSchool: true },
      req
    );
    if (!access.ok) return access.response;

    const { key, bucket } = await req.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    const resolvedBucket: "assets" | "uploads" = bucket === "assets" ? "assets" : "uploads";

    if (!key.startsWith(`${access.context.schoolId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteFile(key, resolvedBucket);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to delete file") },
      { status: 500 }
    );
  }
}
