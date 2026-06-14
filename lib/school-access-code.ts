import { supabaseAdmin } from "@/lib/supabase";
import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import { normalizeRole } from "@/lib/roles";

export type AccessCodeRow = {
  code: string;
  expires_at: string;
  used_at: string | null;
  max_uses: number | null;
  use_count: number | null;
  province: string | null;
  district: string | null;
  school_type: string | null;
  ownership_type: string | null;
  approval_status: string | null;
  created_by: string | null;
};

export type AccessCodeScope = {
  province: string | null;
  district: string | null;
  schoolType: string | null;
  ownershipType: string | null;
};

export type AccessCodeValidationResult =
  | { ok: true; row: AccessCodeRow; scope: AccessCodeScope }
  | { ok: false; status: 400 | 403 | 500; error: string };

const ACCESS_CODE_SELECT =
  "code, expires_at, used_at, max_uses, use_count, province, district, school_type, ownership_type, approval_status, created_by";

export function matchesCodeScope(
  expected: string | null | undefined,
  actual: string | null | undefined
) {
  const expectedValue = String(expected || "").trim().toLowerCase();
  if (!expectedValue) return true;
  return expectedValue === String(actual || "").trim().toLowerCase();
}

export function accessCodeScopeFromRow(row: AccessCodeRow): AccessCodeScope {
  return {
    province: row.province || null,
    district: row.district || null,
    schoolType: row.school_type || null,
    ownershipType: row.ownership_type || null,
  };
}

function isCodeExhausted(row: AccessCodeRow) {
  const maxUses = Number(row.max_uses || 1);
  const useCount = Number(row.use_count || 0);
  return Boolean(row.used_at) || useCount >= maxUses;
}

function isCodeExpired(row: AccessCodeRow, now = new Date()) {
  return now > new Date(row.expires_at);
}

async function isSuperAdminIssuer(createdBy: string | null): Promise<boolean> {
  if (!createdBy) return false;

  const { data: creatorProfile } = await fetchProfileByIdentity<{
    role?: string | null;
  }>(supabaseAdmin as any, createdBy, "role");

  return normalizeRole(creatorProfile?.role) === "SUPER_ADMIN";
}

export async function fetchAccessCodeByValue(
  code: string
): Promise<{ row: AccessCodeRow | null; dbError: boolean }> {
  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .select(ACCESS_CODE_SELECT)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[access-code] DB error:", error);
    return { row: null, dbError: true };
  }

  return { row: (data as AccessCodeRow | null) ?? null, dbError: false };
}

export async function validateSchoolAccessCode(
  code: string,
  options?: {
    schoolDetails?: {
      province?: string | null;
      district?: string | null;
      schoolType?: string | null;
      ownershipType?: string | null;
    };
  }
): Promise<AccessCodeValidationResult> {
  const { row, dbError } = await fetchAccessCodeByValue(code);

  if (dbError) {
    return {
      ok: false,
      status: 500,
      error: "Could not verify access code. Please try again.",
    };
  }

  if (!row) {
    return {
      ok: false,
      status: 400,
      error: "Invalid access code. Please check and try again.",
    };
  }

  if (!(await isSuperAdminIssuer(row.created_by))) {
    return {
      ok: false,
      status: 400,
      error: "Invalid access code. Please check and try again.",
    };
  }

  if (isCodeExhausted(row)) {
    return {
      ok: false,
      status: 400,
      error: "This access code has already been used.",
    };
  }

  if (row.approval_status && row.approval_status !== "approved") {
    return {
      ok: false,
      status: 400,
      error: "This access code is not approved for school creation yet.",
    };
  }

  if (isCodeExpired(row)) {
    return {
      ok: false,
      status: 400,
      error: "This access code has expired. Please request a new one.",
    };
  }

  const details = options?.schoolDetails;
  if (details) {
    const codeMismatch =
      !matchesCodeScope(row.province, details.province) ||
      !matchesCodeScope(row.district, details.district) ||
      !matchesCodeScope(row.school_type, details.schoolType) ||
      !matchesCodeScope(row.ownership_type, details.ownershipType);

    if (codeMismatch) {
      return {
        ok: false,
        status: 400,
        error: "This access code is not assigned to the submitted school details.",
      };
    }
  }

  return { ok: true, row, scope: accessCodeScopeFromRow(row) };
}

export async function consumeSchoolAccessCode(code: string, email: string) {
  const { row, dbError } = await fetchAccessCodeByValue(code);
  if (dbError || !row) return;

  const maxUses = Number(row.max_uses || 1);
  const useCount = Number(row.use_count || 0);
  const nextCount = useCount + 1;

  await supabaseAdmin
    .from("access_codes")
    .update({
      used_at: nextCount >= maxUses ? new Date().toISOString() : null,
      used_by_email: email,
      use_count: nextCount,
    })
    .eq("code", code);
}
