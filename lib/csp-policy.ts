import { getConfiguredClientR2PublicUrl, getConfiguredR2PublicUrl } from "./r2-config";

export type CspBuildInput = {
  isProduction: boolean;
  shouldUpgradeInsecureRequests: boolean;
  supabaseOrigin?: string | null;
};

function parseOrigin(value: string | undefined): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function resolveSupabaseConnectOrigin(): string | null {
  return parseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
}

export function buildContentSecurityPolicy(input: CspBuildInput): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", "https:"].concat(
    input.isProduction ? [] : ["'unsafe-eval'"],
  );

  const styleSrc = ["'self'", "'unsafe-inline'", "https:"];

  const imgHosts = unique([
    parseOrigin(getConfiguredR2PublicUrl()) ?? undefined,
    parseOrigin(getConfiguredClientR2PublicUrl()) ?? undefined,
    parseOrigin(process.env.CDN_BASE_URL),
    parseOrigin(process.env.NEXT_PUBLIC_CDN_BASE_URL),
    input.supabaseOrigin ?? resolveSupabaseConnectOrigin(),
  ]);

  const imgSrc = unique(["'self'", "data:", "blob:", "https:", ...imgHosts]);

  const connectSrc = unique([
    "'self'",
    "https:",
    "wss:",
    input.supabaseOrigin ?? resolveSupabaseConnectOrigin(),
  ]);

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data: https:",
    `style-src ${styleSrc.join(" ")}`,
    `script-src ${scriptSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
  ];

  if (input.shouldUpgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function isProductionCspMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.CSP_PRODUCTION === "true"
  );
}