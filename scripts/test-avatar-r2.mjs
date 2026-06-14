/**
 * Smoke test: R2 assets upload + public URL resolution (no Next server required).
 * Usage: node --env-file=.env.local scripts/test-avatar-r2.mjs
 */
import { uploadFile, getPublicUrl, getFileBuffer } from "../lib/r2-client.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const key = `test/smoke/${Date.now()}-avatar.png`;

try {
  await uploadFile(key, png, { bucket: "assets", contentType: "image/png" });
  const url = getPublicUrl(key, "assets");
  const roundTrip = await getFileBuffer(key, "assets");

  console.log("upload: ok");
  console.log("publicUrl:", url);
  console.log("roundTrip bytes:", roundTrip.length);

  if (!url.includes("avatars") && !url.includes("test/smoke")) {
    console.warn("unexpected url shape");
  }

  if (url.startsWith("/api/public/assets/")) {
    console.log("mode: app proxy (set R2_PUBLIC_URL for CDN delivery)");
  } else if (url.includes(".r2.dev")) {
    console.log("mode: R2 public bucket");
  }

  process.exit(0);
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
}