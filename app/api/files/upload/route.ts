import { NextRequest, NextResponse } from "next/server";

import { uploadFile } from "@/lib/r2-client";
import { safeErrorMessage } from "@/lib/server-guards";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const entityType = String(formData.get("entityType") || "").trim();

    if (!(file instanceof File) || !entityType) {
      return NextResponse.json(
        { error: "Invalid request. Provide a file and a valid entityType." },
        { status: 400 },
      );
    }

    const authorizeUrl = new URL("/api/files/authorize-upload", req.url);
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    const authorizeHeaders = new Headers({
      "Content-Type": "application/json",
    });
    if (authHeader) {
      authorizeHeaders.set("Authorization", authHeader);
    }

    const authorizeResponse = await fetch(
      new Request(authorizeUrl.toString(), {
        method: "POST",
        headers: authorizeHeaders,
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          entityType,
        }),
      }),
    );

    if (!authorizeResponse.ok) {
      const errorBody = await authorizeResponse.json().catch(() => null);
      return NextResponse.json(
        { error: errorBody?.error || "Upload authorization failed" },
        { status: authorizeResponse.status },
      );
    }

    const authorization = (await authorizeResponse.json()) as {
      bucket?: string;
      key?: string;
    };
    const key = String(authorization.key || "").trim();
    if (!key) {
      return NextResponse.json(
        { error: "Upload authorization did not include a storage key" },
        { status: 502 },
      );
    }

    const result = await uploadFile(
      key,
      Buffer.from(await file.arrayBuffer()),
      {
        bucket: "uploads",
        contentType: file.type || "application/octet-stream",
      },
    );

    return NextResponse.json({
      bucket: "uploads" as const,
      key: result.key,
      url: result.url || null,
      size: file.size,
      mimeType: file.type,
      originalName: file.name,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to upload file") },
      { status: 500 },
    );
  }
}
