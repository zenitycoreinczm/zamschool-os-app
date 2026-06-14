import { supabase } from "@/lib/supabase";

const GATEWAY_URL = String(process.env.NEXT_PUBLIC_GATEWAY_URL || "").trim();

export async function fetchGatewayRead(
  path: string,
  init: RequestInit & {
    fallbackToLocal?: boolean;
  } = {}
) {
  const fallbackToLocal = init.fallbackToLocal !== false;
  const localUrl = String(path || "").trim();
  const gatewayUrl = buildGatewayUrl(localUrl);

  if (!gatewayUrl) {
    return fetch(localUrl, init);
  }

  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token || "";

  if (!accessToken) {
    if (fallbackToLocal) {
      return fetch(localUrl, init);
    }

    return fetch(gatewayUrl, init);
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);

  try {
    const response = await fetch(gatewayUrl, {
      ...init,
      credentials: "omit",
      headers,
    });

    if (!fallbackToLocal || response.ok || !shouldFallback(response.status)) {
      return response;
    }
  } catch (error) {
    if (!fallbackToLocal) {
      throw error;
    }
  }

  return fetch(localUrl, init);
}

function buildGatewayUrl(path: string) {
  if (!GATEWAY_URL || !path.startsWith("/")) {
    return null;
  }

  return new URL(path.slice(1), ensureTrailingSlash(GATEWAY_URL)).toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function shouldFallback(status: number) {
  return status === 404 || status === 429 || status >= 500;
}
