import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

type GenerateOtpCodeOptions = {
  randomIntFn?: (min: number, max: number) => number;
};

type OtpHashInput = {
  email: string;
  userId: string;
  otpCode: string;
  secret: string;
};

type OtpMatchInput = OtpHashInput & {
  storedHash: string | null | undefined;
};

const HASH_ENCODING = "hex";

export function generateOtpCode(options: GenerateOtpCodeOptions = {}) {
  // Use cryptographically secure random integers for 6-digit OTP
  const randomIntFn = options.randomIntFn || randomInt;
  return String(randomIntFn(100000, 1000000)).padStart(6, "0");
}

export function hashOtpCode(input: OtpHashInput) {
  // Use SHA-256 HMAC for secure, salt-based hashing of the OTP
  return createHmac("sha256", normalizeSecret(input.secret))
    .update(buildOtpFingerprint(input))
    .digest(HASH_ENCODING);
}

export function isOtpCodeMatch(input: OtpMatchInput) {
  const storedHash = String(input.storedHash || "").trim();
  if (!storedHash) {
    return false;
  }

  // Fallback for legacy plain-text OTPs (if any), but prioritize secure matching
  if (!looksLikeHashedOtp(storedHash)) {
    return timingSafeEqual(
      Buffer.from(storedHash),
      Buffer.from(normalizeOtpCode(input.otpCode))
    );
  }

  const candidateHash = hashOtpCode(input);
  // Use timing-safe comparison to prevent side-channel attacks
  return timingSafeEqual(Buffer.from(storedHash), Buffer.from(candidateHash));
}

export function resolveOtpSecret(env = process.env) {
  const secret = String(env.OTP_SECRET || "").trim();
  if (!secret) {
    throw new Error("Security Error: Missing OTP_SECRET in environment.");
  }

  return secret;
}

function buildOtpFingerprint(input: OtpHashInput) {
  // Bind the OTP to the specific user and email to prevent replay/substitution attacks
  return [
    normalizeEmail(input.email),
    String(input.userId || "").trim(),
    normalizeOtpCode(input.otpCode),
  ].join(":");
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOtpCode(otpCode: string) {
  return String(otpCode || "").trim();
}

function normalizeSecret(secret: string) {
  return String(secret || "").trim();
}

function looksLikeHashedOtp(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}
