import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient["auth"], "getSession" | "getUser"> & {
  getClaims?: SupabaseClient["auth"]["getClaims"];
};

function resolveAuthClient(client: AuthClient | SupabaseClient): AuthClient {
  return "auth" in client ? client.auth : client;
}

/**
 * Resolves the current user without calling /auth/v1/user when the access token
 * can be verified locally (asymmetric JWT + JWKS). Falls back to getUser() only
 * when needed.
 */
export async function resolveVerifiedAuthUser(
  client: AuthClient | SupabaseClient
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const auth = resolveAuthClient(client);
  const {
    data: { session },
    error: sessionError,
  } = await auth.getSession();

  if (sessionError) {
    return { user: null, session: null, error: sessionError };
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    return { user: null, session: null, error: null };
  }

  const { data: claimsData, error: claimsError } = auth.getClaims
    ? await auth.getClaims(accessToken)
    : { data: null, error: new Error("getClaims unavailable") };

  if (!claimsError && claimsData?.claims?.sub) {
    const sub = String(claimsData.claims.sub);
    const email =
      typeof claimsData.claims.email === "string" ? claimsData.claims.email : undefined;
    return {
      user: { id: sub, email } as User,
      session,
      error: null,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await auth.getUser();

  return {
    user: user ?? null,
    session: user ? session : null,
    error: userError ?? null,
  };
}

/**
 * Validates a bearer access token. Tries local JWT verification first.
 */
export async function resolveVerifiedBearerUser(
  client: AuthClient | SupabaseClient,
  bearerToken: string
): Promise<{ user: User | null; error: Error | null }> {
  const auth = resolveAuthClient(client);
  const token = bearerToken.trim();
  if (!token) {
    return { user: null, error: new Error("Missing bearer token") };
  }

  if (auth.getClaims) {
    const { data: claimsData, error: claimsError } = await auth.getClaims(token);
    if (!claimsError && claimsData?.claims?.sub) {
      const email =
        typeof claimsData.claims.email === "string" ? claimsData.claims.email : undefined;
      return {
        user: { id: String(claimsData.claims.sub), email } as User,
        error: null,
      };
    }
  }

  const { data, error } = await auth.getUser(token);
  return {
    user: data.user ?? null,
    error: error ?? null,
  };
}