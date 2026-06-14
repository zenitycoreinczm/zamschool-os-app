import { normalizeRole } from "./roles";

type CookieEntry = {
  name: string;
  value: string;
};

type SessionLike = {
  access_token?: string | null;
  user?: {
    role?: string | null;
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
};

const BASE64_PREFIX = "base64-";
const CHUNK_SUFFIX = /\.(\d+)$/;

export function getSupabaseAuthCookieName(supabaseUrl: string | null | undefined) {
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export function combineSupabaseCookieChunks(
  cookies: CookieEntry[],
  baseName: string
) {
  const exact = cookies.find((cookie) => cookie.name === baseName);
  if (exact?.value) {
    return exact.value;
  }

  const chunks = cookies
    .map((cookie) => {
      const match = cookie.name.match(CHUNK_SUFFIX);
      if (!match) return null;
      if (cookie.name.slice(0, match.index) !== baseName) return null;
      return {
        index: Number(match[1]),
        value: cookie.value,
      };
    })
    .filter((value): value is { index: number; value: string } => Boolean(value))
    .sort((left, right) => left.index - right.index);

  if (chunks.length === 0) {
    return null;
  }

  return chunks.map((chunk) => chunk.value).join("");
}

export function decodeSupabaseSessionCookie(value: string | null | undefined): SessionLike | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const decoded = normalized.startsWith(BASE64_PREFIX)
    ? decodeBase64Url(normalized.slice(BASE64_PREFIX.length))
    : normalized;
  if (!decoded) return null;

  try {
    return JSON.parse(decoded) as SessionLike;
  } catch {
    return null;
  }
}

export function resolveSupabaseSessionFromCookies(input: {
  cookies: CookieEntry[];
  supabaseUrl: string | null | undefined;
}) {
  const cookieName = getSupabaseAuthCookieName(input.supabaseUrl);
  if (!cookieName) {
    return null;
  }

  const cookieValue = combineSupabaseCookieChunks(input.cookies, cookieName);
  const session = decodeSupabaseSessionCookie(cookieValue);

  return session;
}

export function resolveSessionRole(session: SessionLike | null | undefined) {
  const user = session?.user;
  const candidates = [
    user?.app_metadata?.role,
    user?.role,
    user?.user_metadata?.role,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRole(String(candidate || ""));
    if (normalized) return normalized;
  }

  return null;
}

export function resolveSessionMustChangePassword(session: SessionLike | null | undefined) {
  const user = session?.user;
  const candidates = [
    user?.user_metadata?.must_change_password,
    user?.app_metadata?.must_change_password,
  ];

  return candidates.some((candidate) => candidate === true);
}

export function resolveSessionAal(session: SessionLike | null | undefined): string | null {
  const token = session?.access_token;
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = decodeBase64Url(payload);
    if (!decoded) return null;

    const claims = JSON.parse(decoded) as Record<string, unknown>;
    return String(claims.aal || "") || null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
