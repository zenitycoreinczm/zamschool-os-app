"use client";

import { fetchWithOfflineSupport } from "@/lib/offline-fetch";
import { getClientAccessToken } from "@/lib/supabase-auth-client";

/**
 * Inflight request deduplication for GET requests.
 * Prevents duplicate parallel fetches for the same URL.
 */
const inflightGet = new Map<string, Promise<Response>>();

async function dedupedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = String(init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return fetchWithOfflineSupport(input, {
      ...init,
      headers: buildHeaders(init),
      cache: init.cache ?? "no-store",
      credentials: "same-origin",
    });
  }

  const existing = inflightGet.get(input);
  if (existing) return existing;

  const promise = fetchWithOfflineSupport(input, {
    ...init,
    headers: buildHeaders(init),
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
  }).finally(() => {
    inflightGet.delete(input);
  });

  inflightGet.set(input, promise);
  return promise;
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  // Authorization is attached lazily below in the exported helpers.
  return headers;
}

export async function accountApiFetch(input: string, init: RequestInit = {}) {
  const headers = buildHeaders(init);

  if (!headers.has("Authorization")) {
    const accessToken = await getClientAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return dedupedFetch(input, { ...init, headers });
}

export async function accountApiJson<T = unknown>(input: string, init: RequestInit = {}) {
  const response = await accountApiFetch(input, init);
  const parsedBody = await response.json().catch(() => null);
  const body = typeof parsedBody === "object" && parsedBody !== null ? parsedBody : {};

  if (!response.ok) {
    throw new Error(
      (body as { error?: string }).error ||
        response.statusText ||
        `Request failed with status ${response.status}`
    );
  }

  return body as T;
}