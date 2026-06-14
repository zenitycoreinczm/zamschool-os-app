import { buildAuthCallbackUrl, getAppOrigin } from "@/lib/app-origin";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Triggers a password-recovery email through Supabase Auth (dashboard SMTP).
 * Used when app-level SMTP env vars are not set.
 */
export async function sendSupabaseRecoveryEmail(
  email: string,
  nextPath = "/reset-password"
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: "Missing Supabase credentials" };
  }

  const redirectTo = buildAuthCallbackUrl(nextPath);

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        redirect_to: redirectTo,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body?.msg === "string"
          ? body.msg
          : typeof body?.error_description === "string"
            ? body.error_description
            : `Recovery email failed (${response.status})`;
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send recovery email",
    };
  }
}

export function buildLoginEmailContext() {
  return {
    appName: "ZamSchool OS",
    loginUrl: `${getAppOrigin()}/login`,
    supportHint: "Contact your school office if you did not expect this message.",
  };
}