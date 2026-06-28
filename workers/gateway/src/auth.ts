import type { Env, SessionSnapshot } from "./types.ts";

type JwtHeader = { alg?: string; typ?: string };
type JwtPayload = {
  sub?: string;
  role?: string;
  email?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  user_metadata?: { school_id?: string };
};

/**
 * Validates the Authorization header.
 * - Production: verifies Supabase HS256 JWT signature when SUPABASE_JWT_SECRET is set.
 * - Offline: serves cached session snapshots from SESSION_CACHE KV.
 * - Local dev only: JWT_VERIFY_MODE=decode with ALLOW_INSECURE_JWT_DECODE=true skips signature check.
 */
export async function verifyAuth(req: Request, env: Env): Promise<SessionSnapshot | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

  const cached = await env.SESSION_CACHE?.get<SessionSnapshot>(tokenHash, { type: "json" });
  if (cached && cached.exp > Date.now() / 1000) {
    return cached;
  }

  const payload = await validateJwt(token, env);
  if (!payload) {
    return null;
  }

  const session = sessionFromPayload(payload);
  if (!session) {
    return null;
  }

  const ttlSec = Math.max(Math.floor(session.exp - Date.now() / 1000), 60);
  await env.SESSION_CACHE?.put(tokenHash, JSON.stringify(session), { expirationTtl: ttlSec });

  return session;
}

async function validateJwt(token: string, env: Env): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(decodeBase64Url(headerPart)) as JwtHeader;
    payload = JSON.parse(decodeBase64Url(payloadPart)) as JwtPayload;
  } catch {
    return null;
  }

  if (header.alg !== "HS256") {
    return null;
  }

  if (!payload.sub || !payload.exp || payload.exp <= Date.now() / 1000) {
    return null;
  }

  if (env.SUPABASE_JWT_ISSUER && payload.iss !== env.SUPABASE_JWT_ISSUER) {
    return null;
  }

  if (env.SUPABASE_JWT_AUDIENCE) {
    const expectedAud = env.SUPABASE_JWT_AUDIENCE;
    const audMatches = Array.isArray(payload.aud)
      ? payload.aud.includes(expectedAud)
      : payload.aud === expectedAud;
    if (!audMatches) {
      return null;
    }
  }

  const verifyMode = String(env.JWT_VERIFY_MODE || "signature").toLowerCase();
  const secret = String(env.SUPABASE_JWT_SECRET || "").trim();

  if (secret) {
    const valid = await verifyHs256Signature(secret, `${headerPart}.${payloadPart}`, signaturePart);
    if (!valid) {
      return null;
    }
    return payload;
  }

  if (
    verifyMode === "decode" &&
    String(env.ALLOW_INSECURE_JWT_DECODE || "").toLowerCase() === "true"
  ) {
    if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
      console.error("[auth] CRITICAL: ALLOW_INSECURE_JWT_DECODE is enabled in production — refusing to start");
      return null;
    }
    console.warn("[auth] ALLOW_INSECURE_JWT_DECODE enabled — signature not verified");
    return payload;
  }

  return null;
}

function sessionFromPayload(payload: JwtPayload): SessionSnapshot | null {
  if (!payload.sub) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role || "authenticated",
    schoolId: payload.user_metadata?.school_id || "unknown",
    email: payload.email || "",
    exp: payload.exp || Math.floor(Date.now() / 1000) + 86400,
  };
}

async function verifyHs256Signature(
  secret: string,
  signedContent: string,
  signaturePart: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = new Uint8Array(base64UrlToBytes(signaturePart));
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(signedContent));
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + "=".repeat(padLength));
}

function base64UrlToBytes(input: string): Uint8Array {
  const binary = decodeBase64Url(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Test helper: build a signed HS256 JWT for unit tests. */
export async function signTestJwt(
  secret: string,
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" }
): Promise<string> {
  const encoder = new TextEncoder();
  const headerPart = bytesToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadPart = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signedContent = `${headerPart}.${payloadPart}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
  return `${signedContent}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
