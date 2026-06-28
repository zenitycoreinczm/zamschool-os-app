"use client";

import {
  fetchGatewayRead,
  fetchGatewayMutation,
  isGatewayConfigured,
} from "@/lib/gateway-read-client";
import { fetchWithOfflineSupport } from "@/lib/offline-fetch";

/**
 * Inflight request deduplication for GET requests to same-origin /api/*.
 */
const inflightGet = new Map<string, Promise<Response>>();

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrf-token=`);
  if (parts.length === 2) {
    const token = parts.pop()?.split(";").shift() || null;
    return token || null;
  }
  return null;
}

function buildLocalHeaders(init: RequestInit, method: string): Headers {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  // Authorization is attached by the gateway helpers on the Worker path;
  // for the local /api/* fallback we just rely on cookie auth that
  // middleware.ts resolves.
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    const csrf = getCsrfTokenFromCookie();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  return headers;
}

export async function accountApiFetch(input: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").toUpperCase();

  if (isGatewayConfigured()) {
    if (method === "GET" || method === "HEAD") {
      return fetchGatewayRead(input, {
        ...init,
        cache: init.cache ?? "default",
      });
    }
    return fetchGatewayMutation(input, init);
  }

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

export async function accountApiJson<T = unknown>(
  input: string,
  init: RequestInit = {},
) {
  const response = await accountApiFetch(input, init);
  const parsedBody = await response.json().catch(() => null);
  const body =
    typeof parsedBody === "object" && parsedBody !== null ? parsedBody : {};

  if (!response.ok) {
    const errBody = body as { error?: string; cause?: string };
    // Prefer `cause` over `error` because API routes that round-trip
    // through `safeErrorMessage()` write a generic fallback to `error`
    // (`"Failed to load session"`) and put the real cause in `cause`
    // (non-prod only). Showing `cause` makes dev/staging toasts
    // meaningful; prod has no `cause`, so `error` is what users see.
    const message = errBody.cause || errBody.error ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}
