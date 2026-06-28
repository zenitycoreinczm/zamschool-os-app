import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { safeErrorMessage } from "../../../../lib/server-guards";
import {
  applyAuthApiRateLimit,
  authApiRateLimitResponse,
} from "../../../../lib/auth-api-rate-limit";
import {
  clearFirstLoginState,
  FirstLoginError,
} from "../../../../lib/first-login";
import { fetchProfileByIdentity } from "../../../../lib/profile-lookup";
import {
  resolveVerifiedAuthUser,
  resolveVerifiedBearerUser,
} from "@/lib/supabase-auth-verify";

async function resolveFirstLoginUser(req: Request) {
  const bearerToken = readBearerToken(req);
  if (bearerToken !== null) {
    if (!bearerToken) {
      return { user: null, error: new Error("Invalid authorization header") };
    }

    return resolveVerifiedBearerUser(supabaseAdmin.auth, bearerToken);
  }

  const supabase = await createClient();
  return resolveVerifiedAuthUser(supabase);
}

export async function POST(req: Request) {
  try {
    const auth = await resolveFirstLoginUser(req);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = auth.user;

    const rate = await applyAuthApiRateLimit({
      scope: "completeFirstLogin",
      req,
      userId: user.id,
    });
    if (!rate.allowed) {
      return authApiRateLimitResponse(rate);
    }

    const { data: profile, error: profileError } =
      await fetchProfileByIdentity<{
        must_change_password?: boolean | null;
      }>(supabaseAdmin as any, user.id, "must_change_password", user.email);

    if (profileError && !isMissingColumnError(profileError)) {
      throw profileError;
    }

    const profileRequiresChange =
      profile && typeof profile.must_change_password === "boolean"
        ? profile.must_change_password === true
        : false;

    if (!profileRequiresChange) {
      return NextResponse.json(
        { error: "Password change is not required." },
        { status: 409 },
      );
    }

    await clearFirstLoginState({
      adminClient: supabaseAdmin,
      userId: user.id,
      userMetadata: user.user_metadata || {},
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof FirstLoginError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to complete first login") },
      { status: 500 },
    );
  }
}

function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("does not exist");
}

function readBearerToken(req: Request) {
  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}
