import { fetchWithOfflineSupport } from "./offline-fetch.ts";

export type AdminRouteRequestInit = RequestInit & {
  params?: Record<string, string | number | boolean | null | undefined>;
};

type AdminRouteAuthTokenProvider = () => Promise<string | null> | string | null;

const defaultAuthTokenProvider: AdminRouteAuthTokenProvider = async () => {
  const { getClientAccessToken } = await import("@/lib/supabase-auth-client");
  return getClientAccessToken();
};

let authTokenProvider: AdminRouteAuthTokenProvider = defaultAuthTokenProvider;

export async function parseAdminRouteResponse(response: Response) {
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && (payload.error || payload.message)) ||
      "Request failed";
    throw new Error(String(message));
  }

  return payload;
}

export async function adminRequest(path: string, init: AdminRouteRequestInit = {}) {
  const url = new URL(path, globalThis.location?.origin || "http://localhost");
  const headers = new Headers(init.headers);

  if (init.params) {
    for (const [key, value] of Object.entries(init.params)) {
      if (value === null || value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const token = await authTokenProvider();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetchWithOfflineSupport(url.toString(), {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
    credentials: init.credentials ?? "include",
  });

  return parseAdminRouteResponse(response);
}

export function adminGet(path: string, init: Omit<AdminRouteRequestInit, "method"> = {}) {
  return adminRequest(path, { ...init, method: "GET" });
}

export function adminPost<TBody>(path: string, body: TBody, init: Omit<AdminRouteRequestInit, "method" | "body"> = {}) {
  return adminRequest(path, {
    ...init,
    method: "POST",
    headers: jsonHeaders(init.headers),
    body: JSON.stringify(body),
  });
}

export function adminDelete(path: string, init: Omit<AdminRouteRequestInit, "method"> = {}) {
  return adminRequest(path, { ...init, method: "DELETE" });
}

export function buildFinanceMutationPayload(form: {
  type: string;
  category: string;
  amount: string | number;
  description: string;
  transaction_date: string;
}) {
  return {
    transactionType: String(form.type || "income"),
    category: normalizeOptionalString(form.category),
    amount: normalizeAmount(form.amount),
    description: normalizeOptionalString(form.description),
    transactionDate: form.transaction_date || new Date().toISOString().slice(0, 10),
  };
}

export function setAdminRouteAuthTokenProvider(provider: AdminRouteAuthTokenProvider) {
  authTokenProvider = provider;
}

export function resetAdminRouteAuthTokenProvider() {
  authTokenProvider = defaultAuthTokenProvider;
}

function jsonHeaders(existingHeaders?: HeadersInit) {
  const headers = new Headers(existingHeaders);
  headers.set("Content-Type", "application/json");
  return headers;
}

function normalizeOptionalString(value: string) {
  const text = String(value || "").trim();
  return text || undefined;
}

function normalizeAmount(value: string | number) {
  if (typeof value === "number") return value;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
