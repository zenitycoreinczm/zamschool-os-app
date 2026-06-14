/**
 * Canonical public origin for links in emails and Supabase Auth redirects.
 */
export function getAppOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_ORIGIN,
    process.env.NEXT_PUBLIC_WEBAPP_ORIGIN,
    process.env.NEXT_PUBLIC_WEB_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ];

  for (const value of candidates) {
    const trimmed = String(value || "").trim().replace(/\/$/, "");
    if (trimmed) return trimmed;
  }

  return "http://localhost:3000";
}

export function buildAuthCallbackUrl(nextPath = "/"): string {
  const origin = getAppOrigin();
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function buildPasswordResetRedirectUrl(): string {
  return buildAuthCallbackUrl("/reset-password");
}