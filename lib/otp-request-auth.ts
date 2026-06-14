import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVerifiedAuthUser, resolveVerifiedBearerUser } from "@/lib/supabase-auth-verify";

function readBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}

/** OTP endpoints only accept the authenticated user matching `userId`. */
export async function assertOtpRequestMatchesUser(req: Request, userId: string) {
  const bearerToken = readBearerToken(req);

  if (bearerToken !== null) {
    if (!bearerToken) {
      throw new OtpAuthError("Unauthorized", 401);
    }

    const { user, error } = await resolveVerifiedBearerUser(supabaseAdmin.auth, bearerToken);
    if (error || !user?.id || user.id !== userId) {
      throw new OtpAuthError("Unauthorized", 401);
    }
    return;
  }

  const supabase = await createClient();
  const { user, error } = await resolveVerifiedAuthUser(supabase);
  if (error || !user?.id || user.id !== userId) {
    throw new OtpAuthError("Sign in required to verify this email.", 401);
  }
}

export class OtpAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OtpAuthError";
    this.status = status;
  }
}