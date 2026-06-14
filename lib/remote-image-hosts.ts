/**
 * Hostnames/patterns allowed for next/image (mirrors next.config.ts remotePatterns).
 * Uses NEXT_PUBLIC_* env vars for client-side URL checks after avatar upload.
 */

function parseHostnameFromBaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).hostname;
  } catch {
    return null;
  }
}

function uniqueHosts(hosts: Array<string | null | undefined>): string[] {
  return [...new Set(hosts.filter((host): host is string => Boolean(host)))];
}

/** Hostnames from env that are registered in next.config at build time. */
export function getConfiguredImageHostnames(): string[] {
  return uniqueHosts([
    parseHostnameFromBaseUrl(process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
    parseHostnameFromBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    parseHostnameFromBaseUrl(process.env.NEXT_PUBLIC_CDN_BASE_URL),
    "picsum.photos",
    "imagedelivery.net",
  ]);
}

function matchesSupabaseStorageHost(hostname: string): boolean {
  const supabaseHost = parseHostnameFromBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return Boolean(supabaseHost && hostname === supabaseHost);
}

/** Whether a remote URL can be passed to next/image without runtime errors. */
export function isNextImageCompatibleUrl(url: string): boolean {
  if (!url?.trim()) {
    return false;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("/api/public/assets/")) {
    return true;
  }

  // Avatar media URL is authenticated - must use <img> not <Image>
  // because next/image's optimization loses auth cookies internally.
  // The ProfileAvatarImage component handles fallback if this returns false.
  if (trimmed.startsWith("/api/account/avatar/media/")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const { hostname } = parsed;
    const configured = getConfiguredImageHostnames();

    if (configured.includes(hostname)) {
      return true;
    }

    if (hostname === "imagedelivery.net" || hostname.endsWith(".imagedelivery.net")) {
      return true;
    }

    if (matchesSupabaseStorageHost(hostname)) {
      return true;
    }

    // R2 public bucket: pub-<hash>.r2.dev
    if (/^pub-[a-z0-9]+\.r2\.dev$/i.test(hostname)) {
      return true;
    }

    // Other single-label *.r2.dev public endpoints
    if (/^[a-z0-9-]+\.r2\.dev$/i.test(hostname)) {
      return true;
    }

    // Account endpoint or path-style public access
    if (hostname.endsWith(".r2.cloudflarestorage.com")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** User-facing hint when an uploaded/stored avatar URL is not optimizable by next/image. */
export function getRemoteImageConfigMessage(url: string): string | null {
  if (!url?.trim() || isNextImageCompatibleUrl(url)) {
    return null;
  }

  // Protected avatar URLs are served via authenticated API route - no config needed
  if (url.trim().startsWith("/api/account/avatar/media/")) {
    return null;
  }

  let host = "unknown host";
  try {
    host = new URL(url.trim()).hostname;
  } catch {
    // keep default
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (supabaseUrl && matchesSupabaseStorageHost(host)) {
    return `Avatar was saved, but Next.js cannot optimize this Supabase URL. Ensure NEXT_PUBLIC_SUPABASE_URL is set and redeploy.`;
  }

  return `Avatar was saved, but "${host}" is not in the image allowlist. Set NEXT_PUBLIC_SUPABASE_URL (for Supabase avatars) or your CDN URL and redeploy.`;
}