/** App route that serves avatars only to authenticated same-school users. */
export const AVATAR_MEDIA_ROUTE_PREFIX = "/api/account/avatar/media";

export const AVATAR_BUCKET = "profile-avatars";

const AVATAR_OBJECT_REF_PREFIX = "avatar-object:";
const LEGACY_PUBLIC_SEGMENT = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

export function buildAvatarObjectPath(schoolId: string, userId: string) {
  const safeSchool = sanitizeAvatarPathSegment(schoolId, "schoolId");
  const safeUser = sanitizeAvatarPathSegment(userId, "userId");
  return `${safeSchool}/${safeUser}/avatar.webp`;
}

export type AvatarIdentity = {
  schoolId: string;
  userId: string;
};

export function buildProtectedAvatarUrl(
  schoolId: string,
  userId: string,
  updatedAt: number = Date.now(),
): string {
  const safeSchool = encodeURIComponent(
    requireAvatarIdentitySegment(schoolId, "schoolId"),
  );
  const safeUser = encodeURIComponent(
    requireAvatarIdentitySegment(userId, "userId"),
  );
  return `${AVATAR_MEDIA_ROUTE_PREFIX}/${safeSchool}/${safeUser}?v=${updatedAt}`;
}

export function buildAvatarObjectRef(schoolId: string, userId: string): string {
  return `${AVATAR_OBJECT_REF_PREFIX}${buildAvatarObjectPath(schoolId, userId)}`;
}

export function parseAvatarObjectPath(value: string): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(AVATAR_OBJECT_REF_PREFIX)) {
    const path = trimmed.slice(AVATAR_OBJECT_REF_PREFIX.length);
    return path.includes("/") ? path : null;
  }

  if (trimmed.startsWith(AVATAR_MEDIA_ROUTE_PREFIX)) {
    try {
      const url = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "http://localhost");
      const segments = url.pathname.split("/").filter(Boolean);
      const mediaIndex = segments.indexOf("media");
      if (mediaIndex < 0 || segments.length < mediaIndex + 3) {
        return null;
      }
      const schoolId = decodeURIComponent(segments[mediaIndex + 1] || "");
      const userId = decodeURIComponent(segments[mediaIndex + 2] || "");
      if (!schoolId || !userId) return null;
      return buildAvatarObjectPath(schoolId, userId);
    } catch {
      return null;
    }
  }

  if (trimmed.includes(LEGACY_PUBLIC_SEGMENT)) {
    const index = trimmed.indexOf(LEGACY_PUBLIC_SEGMENT);
    const path = trimmed
      .slice(index + LEGACY_PUBLIC_SEGMENT.length)
      .split("?")[0]
      .split("#")[0];
    return path.includes("/") ? path : null;
  }

  const bucketMarker = `/${AVATAR_BUCKET}/`;
  const bucketIndex = trimmed.indexOf(bucketMarker);
  if (bucketIndex >= 0) {
    const path = trimmed
      .slice(bucketIndex + bucketMarker.length)
      .split("?")[0]
      .split("#")[0];
    return path.includes("/") ? path : null;
  }

  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/avatar\.webp$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function resolveAvatarIdentity(
  stored: string | null | undefined,
  fallback: AvatarIdentity,
): AvatarIdentity {
  const objectPath = stored ? parseAvatarObjectPath(stored) : null;
  if (!objectPath) {
    return fallback;
  }

  const [schoolId, userId] = objectPath.split("/");
  return {
    schoolId: schoolId || fallback.schoolId,
    userId: userId || fallback.userId,
  };
}

/** Convert any stored avatar value to the protected app URL (never expose public storage URLs). */
export function toProtectedAvatarUrl(
  stored: string | null | undefined,
  identity: AvatarIdentity,
): string | null {
  const trimmed = String(stored || "").trim();
  if (!trimmed) return null;

  const resolved = resolveAvatarIdentity(trimmed, identity);
  if (!resolved.schoolId || !resolved.userId) {
    return null;
  }

  const cacheBust = readCacheBustParam(trimmed) ?? Date.now();
  return buildProtectedAvatarUrl(resolved.schoolId, resolved.userId, cacheBust);
}

export function isProtectedAvatarUrl(url: string | null | undefined): boolean {
  const trimmed = String(url || "").trim();
  return trimmed.startsWith(AVATAR_MEDIA_ROUTE_PREFIX);
}

export function isAllowedAvatarUrlForProfileUpdate(
  url: string | null | undefined,
  identity: AvatarIdentity,
): boolean {
  const trimmed = String(url || "").trim();
  if (!trimmed) return true;
  return (
    isProtectedAvatarUrl(trimmed) && Boolean(parseAvatarObjectPath(trimmed))
  );
}

function sanitizeAvatarPathSegment(value: string, name: string) {
  return requireAvatarIdentitySegment(value, name).replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
}

function requireAvatarIdentitySegment(value: string, name: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error(`Avatar ${name} is required`);
  }
  return trimmed;
}

function readCacheBustParam(value: string): number | null {
  try {
    const url = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "http://localhost");
    const raw = url.searchParams.get("v") || url.searchParams.get("updated");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
