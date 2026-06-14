import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchProfileByIdentity } from "@/lib/profile-lookup";
import {
  resolveVerifiedAuthUser,
  resolveVerifiedBearerUser,
} from "@/lib/supabase-auth-verify";
import {
  buildActorContext,
  type ActorContext,
  type KnownRole,
} from "@/lib/server-auth-core";
import { normalizeRole } from "@/lib/roles";
import {
  getCachedActorSnapshot,
  setCachedActorSnapshot,
} from "@/lib/redis-role-cache";
import { touchActiveSession } from "@/lib/redis-session";

export {
  buildActorContext,
  normalizeRole,
  isAdminRole,
  isSensitiveRole,
  isFinancialRole,
} from "@/lib/server-auth-core";

function readBearerToken(req?: Request) {
  const header =
    req?.headers.get("authorization") || req?.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}

async function getAuthenticatedUser(req?: Request) {
  const bearerToken = readBearerToken(req);
  if (bearerToken !== null) {
    if (!bearerToken) {
      return {
        user: null,
        authError: new Error("Invalid authorization header"),
      };
    }

    const { user, error } = await resolveVerifiedBearerUser(
      supabaseAdmin.auth,
      bearerToken,
    );
    return {
      user,
      authError: error,
    };
  }

  const supabase = await createClient();
  const { user, error } = await resolveVerifiedAuthUser(supabase);

  return {
    user,
    authError: error,
  };
}

function jsonError(result: { status: 401 | 403; error: string }) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function requireActorContext(
  options: {
    allowedRoles: KnownRole[];
    requireSchool: boolean;
    allowMetadataRoleFallback?: boolean;
  },
  req?: Request,
): Promise<
  | {
      ok: false;
      response: NextResponse;
    }
  | {
      ok: true;
      context: ActorContext;
    }
> {
  const { user, authError } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return {
      ok: false as const,
      response: jsonError({
        status: 401,
        error: "Unauthorized",
      }),
    };
  }

  const cached = await getCachedActorSnapshot(user.id);
  let profile: {
    id?: string | null;
    role?: string | null;
    school_id?: string | null;
  } | null = cached
    ? { id: cached.profileId, role: cached.role, school_id: cached.schoolId }
    : null;

  if (!cached || !cached.profileId) {
    const lookup = await fetchProfileByIdentity<{
      id?: string | null;
      role?: string | null;
      school_id?: string | null;
    }>(supabaseAdmin as any, user.id, "id, role, school_id", user.email);
    profile = lookup.data;
    const profileRole = normalizeRole(profile?.role);
    void setCachedActorSnapshot(user.id, {
      role: profileRole,
      schoolId: profile?.school_id ?? null,
      profileId: profile?.id ?? null,
    });
  }

  void touchActiveSession({
    userId: user.id,
    email: user.email,
    lastSeenAt: Date.now(),
  });

  const result = buildActorContext({
    user,
    profile,
    allowedRoles: options.allowedRoles,
    requireSchool: options.requireSchool,
    allowMetadataRoleFallback: options.allowMetadataRoleFallback,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      response: jsonError(result),
    };
  }

  return {
    ok: true as const,
    context: result,
  };
}

export async function requireAdminContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: [
        "ADMIN",
        "PRINCIPAL",
        "DEPUTY_HEAD",
        "BURSAR",
        "GUIDANCE_OFFICE",
        "ACADEMIC_ADMIN",
        "HR_ADMIN",
        "ICT_ADMIN",
        "DISCIPLINE_ADMIN",
        "SUPER_ADMIN",
      ],
      requireSchool: true,
    },
    req,
  );
}

export async function requireAdminSetupContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["ADMIN", "PRINCIPAL", "SUPER_ADMIN"],
      requireSchool: false,
      allowMetadataRoleFallback: true,
    },
    req,
  );
}

export async function requirePrincipalContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["PRINCIPAL"],
      requireSchool: true,
    },
    req,
  );
}

/**
 * Head Teacher override gate — for operations that only the Head Teacher
 * can perform (e.g. unpublishing results, overriding discipline records).
 */
export async function requirePrincipalOverrideContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["PRINCIPAL"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireDeputyHeadContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["DEPUTY_HEAD"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireTeacherContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["TEACHER"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireStudentContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["STUDENT"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireParentContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["PARENT"],
      requireSchool: true,
    },
    req,
  );
}

export async function requirePaymentsContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["PAYMENTS", "BURSAR"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireBursarContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["BURSAR"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireSuperAdminContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["SUPER_ADMIN"],
      requireSchool: false,
    },
    req,
  );
}

export async function requireGuidanceOfficeContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["GUIDANCE_OFFICE"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireICTAdminContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["ICT_ADMIN"],
      requireSchool: true,
    },
    req,
  );
}

export async function requireSchoolStaffContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: [
        "ADMIN",
        "PRINCIPAL",
        "DEPUTY_HEAD",
        "BURSAR",
        "ACADEMIC_ADMIN",
        "HR_ADMIN",
        "ICT_ADMIN",
        "DISCIPLINE_ADMIN",
        "TEACHER",
        "PAYMENTS",
        "GUIDANCE_OFFICE",
      ],
      requireSchool: true,
    },
    req,
  );
}

export async function requireTeacherOrParentContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["TEACHER", "PARENT"],
      requireSchool: true,
    },
    req,
  );
}

const FINANCIAL_ROLES: KnownRole[] = ["BURSAR", "PAYMENTS", "SUPER_ADMIN"];
const FINANCIAL_DELEGATED_READ_ROLES: KnownRole[] = ["PRINCIPAL", "ADMIN"];

export async function requireFinancialContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: FINANCIAL_ROLES,
      requireSchool: true,
    },
    req,
  );
}

/**
 * Financial read access for dedicated finance staff, plus PRINCIPAL/ADMIN only
 * when the route also checks requireFeatureAccess (explicit permission grant).
 */
export async function requireFinancialReadContext(req?: Request) {
  const financial = await requireFinancialContext(req);
  if (financial.ok) {
    return financial;
  }

  return requireActorContext(
    {
      allowedRoles: FINANCIAL_DELEGATED_READ_ROLES,
      requireSchool: true,
    },
    req,
  );
}

/** Bursar-only write gate for finance mutations (SUPER_ADMIN bypasses at feature layer). */
export async function requireFinancialWriteContext(req?: Request) {
  return requireActorContext(
    {
      allowedRoles: ["BURSAR", "SUPER_ADMIN"],
      requireSchool: true,
    },
    req,
  );
}
