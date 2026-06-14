const REQUIRED_NEXT_PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const OPTIONAL_NEXT_PUBLIC_VARS = [
  "NEXT_PUBLIC_R2_PUBLIC_URL",
  "NEXT_PUBLIC_GATEWAY_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEBAPP_ORIGIN",
  "NEXT_PUBLIC_WEBAPP_PREVIEW_ORIGIN",
  "NEXT_PUBLIC_APP_ORIGIN",
  "NEXT_PUBLIC_WEB_ORIGIN",
] as const;

// Next.js only inlines NEXT_PUBLIC_* values in client bundles when they are
// referenced statically. Dynamic reads like process.env[varName] evaluate to
// undefined in the browser, which caused false missing-env errors.
const CLIENT_ENV: Record<
  RequiredClientEnvVar | OptionalClientEnvVar,
  string | undefined
> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_WEBAPP_ORIGIN: process.env.NEXT_PUBLIC_WEBAPP_ORIGIN,
  NEXT_PUBLIC_WEBAPP_PREVIEW_ORIGIN:
    process.env.NEXT_PUBLIC_WEBAPP_PREVIEW_ORIGIN,
  NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
  NEXT_PUBLIC_WEB_ORIGIN: process.env.NEXT_PUBLIC_WEB_ORIGIN,
};

export type RequiredClientEnvVar = (typeof REQUIRED_NEXT_PUBLIC_VARS)[number];
export type OptionalClientEnvVar = (typeof OPTIONAL_NEXT_PUBLIC_VARS)[number];

export function validateClientEnv(): {
  valid: boolean;
  missing: RequiredClientEnvVar[];
  warnings: OptionalClientEnvVar[];
} {
  const missing: RequiredClientEnvVar[] = [];
  const warnings: OptionalClientEnvVar[] = [];

  for (const varName of REQUIRED_NEXT_PUBLIC_VARS) {
    const value = CLIENT_ENV[varName];
    if (!value || value.trim() === "") {
      missing.push(varName);
    }
  }

  for (const varName of OPTIONAL_NEXT_PUBLIC_VARS) {
    const value = CLIENT_ENV[varName];
    if (!value || value.trim() === "") {
      warnings.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function assertClientEnvValid(): void {
  const result = validateClientEnv();
  if (!result.valid) {
    const message = `Missing required client environment variables: ${result.missing.join(", ")}`;
    console.error("[ClientEnv] " + message);
    throw new Error(message);
  }

  if (result.warnings.length > 0) {
    console.warn(
      `[ClientEnv] Optional variables not set: ${result.warnings.join(", ")}`,
    );
  }
}

export function getClientEnvStatus(): Record<string, string | undefined> {
  const status: Record<string, string | undefined> = {};

  for (const varName of REQUIRED_NEXT_PUBLIC_VARS) {
    status[varName] = CLIENT_ENV[varName];
  }

  for (const varName of OPTIONAL_NEXT_PUBLIC_VARS) {
    status[varName] = CLIENT_ENV[varName];
  }

  return status;
}

declare global {
  interface Window {
    __ZAMSCHOOL_ENV_STATUS__?: Record<string, string | undefined>;
  }
}

if (typeof window !== "undefined") {
  window.__ZAMSCHOOL_ENV_STATUS__ = getClientEnvStatus();
}

export const clientEnvStatus = getClientEnvStatus();
