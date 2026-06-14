import {
  AVATAR_BUCKET,
  buildAvatarObjectPath,
  buildAvatarObjectRef,
  buildProtectedAvatarUrl,
} from "@/lib/avatar-url";
import { optimizeImage } from "@/lib/image-optimization";
import { supabaseAdmin } from "@/lib/supabase";

export { AVATAR_BUCKET, buildAvatarObjectPath } from "@/lib/avatar-url";

/** Max raw upload before server-side optimization (2MB). */
export const AVATAR_MAX_INPUT_BYTES = 2 * 1024 * 1024;

/** Target output: 128px WebP, typically under 32KB. */
const AVATAR_OPTIMIZATION = {
  maxWidth: 128,
  maxHeight: 128,
  quality: 78,
  maxSizeKB: 32,
  format: "webp" as const,
};

export function appendCacheBustQuery(url: string, updatedAt: number = Date.now()) {
  const base = url.split("#")[0].split("?")[0];
  return `${base}?updated=${updatedAt}`;
}

export async function processAndUploadAvatar(params: {
  schoolId: string;
  userId: string;
  inputBuffer: Buffer;
}): Promise<{
  avatarUrl: string;
  objectRef: string;
  optimizedBytes: number;
  width: number;
  height: number;
}> {
  const { buffer, metadata } = await optimizeImage(params.inputBuffer, AVATAR_OPTIMIZATION);
  const objectPath = buildAvatarObjectPath(params.schoolId, params.userId);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, buffer, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "private, max-age=300",
    });

  if (uploadError) {
    throw uploadError;
  }

  const updatedAt = Date.now();
  const avatarUrl = buildProtectedAvatarUrl(params.schoolId, params.userId, updatedAt);
  const objectRef = buildAvatarObjectRef(params.schoolId, params.userId);

  return {
    avatarUrl,
    objectRef,
    optimizedBytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
  };
}

/** Persist object ref in DB; APIs expose protected URLs to clients. */
export function getAvatarPersistValue(schoolId: string, userId: string) {
  return buildAvatarObjectRef(schoolId, userId);
}