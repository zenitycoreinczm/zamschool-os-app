"use client";

import { fetchWithOfflineSupport } from "@/lib/offline-fetch";
import { getClientAccessToken } from "@/lib/supabase-auth-client";

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrf-token=`);
  if (parts.length === 2) {
    const token = parts.pop()?.split(";").shift() || null;
    if (!token) {
      console.warn(
        "[CSRF-client] Found cookie 'csrf-token' but value was empty",
      );
    }
    return token;
  }
  console.warn(
    "[CSRF-client] No 'csrf-token' cookie found in document.cookie. Available cookies:",
    document.cookie || "(none)",
  );
  return null;
}

/**
 * Inflight request deduplication for GET requests.
 * Prevents duplicate parallel fetches for the same URL.
 */
const inflightGet = new Map<string, Promise<Response>>();

async function dedupedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = String(init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return fetchWithOfflineSupport(input, {
      ...init,
      headers: buildHeaders(init, method),
      cache: init.cache ?? "no-store",
      credentials: "same-origin",
    });
  }

  const existing = inflightGet.get(input);
  if (existing) return existing;

  const promise = fetchWithOfflineSupport(input, {
    ...init,
    headers: buildHeaders(init, method),
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
  }).finally(() => {
    inflightGet.delete(input);
  });

  inflightGet.set(input, promise);
  return promise;
}

function buildHeaders(init: RequestInit, method: string): Headers {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  // Add CSRF token for mutating methods
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutatingMethods.includes(method.toUpperCase())) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }
  return headers;
}

export async function adminApiFetch(input: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const headers = buildHeaders(init, method);

  if (!headers.has("Authorization")) {
    const accessToken = await getClientAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return dedupedFetch(input, { ...init, headers });
}

export async function adminApiJson<T = any>(
  input: string,
  init: RequestInit = {},
) {
  const response = await adminApiFetch(input, init);
  const parsedBody = await response.json().catch(() => null);
  const body =
    typeof parsedBody === "object" && parsedBody !== null ? parsedBody : {};

  if (!response.ok) {
    throw new Error(
      (body as any)?.error ||
        response.statusText ||
        `Request failed with status ${response.status}`,
    );
  }

  return body as T;
}
