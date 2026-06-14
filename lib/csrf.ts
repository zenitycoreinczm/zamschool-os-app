const CSRF_TOKEN_COOKIE = "csrf-token";
const CSRF_TOKEN_LENGTH = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function validateCsrfToken(
  tokenFromRequest: string | null,
  tokenFromCookie: string | null,
): boolean {
  if (!tokenFromRequest || !tokenFromCookie) return false;
  if (tokenFromRequest.length !== tokenFromCookie.length) return false;

  let result = 0;
  for (let i = 0; i < tokenFromRequest.length; i++) {
    result |= tokenFromRequest.charCodeAt(i) ^ tokenFromCookie.charCodeAt(i);
  }
  return result === 0;
}

export { CSRF_TOKEN_COOKIE };