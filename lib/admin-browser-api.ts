"use client";

import {
  fetchGatewayRead,
  fetchGatewayMutation,
  isGatewayConfigured,
} from "@/lib/gateway-read-client";
import { fetchWithOfflineSupport } from "@/lib/offline-fetch";

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie;
  if (!raw) {
    console.warn("[CSRF-client] document.cookie is empty");
    return null;
  }
  // Parse cookies robustly: handle spaces, multiple cookies, values with =
  for (const pair of raw.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.substring(0, idx).trim();
    if (name === "csrf-token") {
      const value = pair.substring(idx + 1).trim();
      if (value) return value;
      console.warn(
        "[CSRF-client] Found cookie 'csrf-token' but value was empty",
      );
      return null;
    }
  }
  console.warn("[CSRF-client] No 'csrf-token' cookie found.");
  return null;
}

/**
 * Inflight request deduplication for GET requests to same-origin /api/*.
 * Prevents duplicate parallel fetches for the same URL.
 */
const inflightGet = new Map<string, Promise<Response>>();

function buildLocalHeaders(init: RequestInit, method: string): Headers {
  const headers = new Headers(init.headers || {});
  if (
    !headers.has("Content-Type") &&
    init.body &&
    typeof init.body === "string" &&
    method !== "GET"
  ) {
    headers.set("Content-Type", "application/json");
  }
  // CSRF is required by Vercel middleware on mutations. The gateway client
  // also injects CSRF on its own path; here we only inject for the local
  // /api/* fallback branch.
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutatingMethods.includes(method.toUpperCase())) {
    const csrf = getCsrfTokenFromCookie();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  return headers;
}

/**
 * Single fetch entrypoint: prefers the Worker (when NEXT_PUBLIC_GATEWAY_URL
 * is set), falls through to the same-origin /api/* with CSRF + offline support.
 */
export async function adminApiFetch(input: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").toUpperCase();

  if (isGatewayConfigured()) {
    if (method === "GET" || method === "HEAD") {
      // Cache API can serve repeat reads.
      return fetchGatewayRead(input, {
        ...init,
        cache: init.cache ?? "default",
      });
    }
    return fetchGatewayMutation(input, init);
  }

  // Local /api/* fallback.
  const headers = buildLocalHeaders(init, method);

  if (method !== "GET" && method !== "HEAD") {
    return fetchWithOfflineSupport(input, {
      ...init,
      headers,
      cache: init.cache ?? "no-store",
      credentials: "same-origin",
    });
  }

  const existing = inflightGet.get(input);
  if (existing) return existing;

  const promise = fetchWithOfflineSupport(input, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
  }).finally(() => {
    inflightGet.delete(input);
  });

  inflightGet.set(input, promise);
  return promise;
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
