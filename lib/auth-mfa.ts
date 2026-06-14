import { supabase } from "@/lib/supabase";

export type MfaFactor = {
  id: string;
  factor_type: "totp";
  status: "verified" | "unverified";
  friendly_name: string | null;
  created_at: string;
  updated_at: string;
};

export type MfaEnrollResult = {
  factorId: string;
  qrCodeUrl: string;
  secret: string;
};

export type MfaChallengeResult = {
  challengeId: string;
  expiresAt: number;
};

/**
 * Start TOTP enrollment for the current user.
 * Returns the factor ID, QR code URL (for authenticator app scanning),
 * and the raw secret (as a fallback).
 */
export async function startMfaEnrollment(): Promise<MfaEnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "ZamSchool OS",
    friendlyName: "ZamSchool Authenticator",
  });

  if (error) throw error;
  if (!data?.id || !data?.totp?.qr_code || !data?.totp?.secret) {
    throw new Error("MFA enrollment returned incomplete data");
  }

  return {
    factorId: data.id,
    qrCodeUrl: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Verify a newly enrolled factor with a TOTP code.
 * After this call, the factor status becomes "verified".
 */
export async function verifyMfaEnrollment(
  factorId: string,
  code: string
): Promise<{ verified: boolean; factor: MfaFactor }> {
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) throw challengeError;

  const challengeId = challengeData?.id;
  if (!challengeId) throw new Error("No challenge ID returned");

  const { data: verifyData, error: verifyError } =
    await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

  if (verifyError) throw verifyError;

  return {
    verified: (verifyData as any)?.verified ?? false,
    factor: {
      id: factorId,
      factor_type: "totp",
      status: "verified",
      friendly_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Create a challenge for an existing verified factor (used during login).
 */
export async function createMfaChallenge(
  factorId: string
): Promise<MfaChallengeResult> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });

  if (error) throw error;

  const challengeId = data?.id;
  if (!challengeId) throw new Error("No challenge ID returned");

  return {
    challengeId,
    expiresAt: data.expires_at ?? Date.now() + 60_000,
  };
}

/**
 * Verify a challenge with a TOTP code (used during login MFA step).
 * On success, the session is elevated to AAL2.
 */
export async function verifyMfaChallenge(
  factorId: string,
  challengeId: string,
  code: string
): Promise<{ verified: boolean }> {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code: code.trim(),
  });

  if (error) throw error;

  return { verified: (data as any)?.verified ?? false };
}

/**
 * List all enrolled MFA factors for the current user.
 */
export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) throw error;

  return (data?.all ?? []) as MfaFactor[];
}

/**
 * Remove (unenroll) an MFA factor.
 */
export async function unenrollMfaFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) throw error;
}

/**
 * Get the current session's Authenticator Assurance Level.
 * Returns "aal1" (password only) or "aal2" (password + MFA).
 */
export async function getAuthenticatorAssuranceLevel(): Promise<"aal1" | "aal2"> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) throw error;

  return data?.currentLevel ?? "aal1";
}

/**
 * Check whether the current session has been verified with MFA (AAL2).
 */
export async function isSessionAal2(): Promise<boolean> {
  try {
    const level = await getAuthenticatorAssuranceLevel();
    return level === "aal2";
  } catch {
    return false;
  }
}

/**
 * Check if the current user has any verified MFA factors enrolled.
 */
export async function hasMfaEnabled(): Promise<boolean> {
  try {
    const factors = await listMfaFactors();
    return factors.some((f) => f.status === "verified");
  } catch {
    return false;
  }
}