import { NextResponse } from "next/server";

import { applyRateLimit, getClientIp } from "@/lib/server-guards";
import { encodeObjectKeyForUrl, getFileBuffer, normalizePublicBaseUrl } from "@/lib/r2-client";
import {
  getConfiguredR2PublicUrl,
  isAllowedPublicAssetKey,
  isR2CdnConfigured,
} from "@/lib/r2-config";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

/**
 * Dev/local fallback when R2_PUBLIC_URL is unset.
 * When CDN is configured, redirects to R2 public URL (no app-bandwidth proxy).
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const key = path.map((segment) => decodeURIComponent(segment)).join("/");

    if (!isAllowedPublicAssetKey(key)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (isR2CdnConfigured()) {
      const cdnBase = normalizePublicBaseUrl(getConfiguredR2PublicUrl());
      const target = `${cdnBase}/${encodeObjectKeyForUrl(key)}`;
      return NextResponse.redirect(target, 308);
    }

    const ip = getClientIp(req);
    const rate = await applyRateLimit({
      key: `public-assets:${ip}`,
      limit: 120,
      windowMs: 60_000,
      failOpen: true,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const buffer = await getFileBuffer(key, "assets");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForKey(key),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Asset-Delivery": "app-proxy",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}