/**
 * Smoke test: Supabase profile-avatars upload (requires .env.local).
 * Usage: node --env-file=.env.local scripts/test-avatar-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const optimized = await sharp(png)
  .resize(128, 128, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 78 })
  .toBuffer();

const objectPath = `test/smoke/${Date.now()}-avatar.webp`;

const { error: uploadError } = await supabase.storage
  .from("profile-avatars")
  .upload(objectPath, optimized, {
    upsert: true,
    contentType: "image/webp",
  });

if (uploadError) {
  console.error("FAIL upload:", uploadError.message);
  process.exit(1);
}

const { data } = supabase.storage.from("profile-avatars").getPublicUrl(objectPath);

console.log("upload: ok");
console.log("bytes:", optimized.length);
console.log("publicUrl:", data.publicUrl);

if (!data.publicUrl.includes("/storage/v1/object/public/profile-avatars/")) {
  console.warn("unexpected url shape");
}

process.exit(0);