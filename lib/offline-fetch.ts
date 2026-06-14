import {
  OFFLINE_FETCH_ERROR_MESSAGE,
} from "./offline-support.ts";
import { networkStatusStore } from "./network-status.ts";

type OfflineAwareFetchOptions = {
  fetchImpl?: typeof fetch;
  getBrowserOnline?: () => boolean;
  store?: typeof networkStatusStore;
  now?: () => number;
};

export async function fetchWithOfflineSupport(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: OfflineAwareFetchOptions = {}
) {
  const fetchImpl = options.fetchImpl || fetch;
  const getBrowserOnline =
    options.getBrowserOnline ||
    (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const store = options.store || networkStatusStore;
  const now = options.now || Date.now;
  const method = String(init.method || "GET").toUpperCase();
  const browserOnline = getBrowserOnline();

  if (isMutationMethod(method) && !browserOnline) {
    store.setOffline();
    throw new Error(OFFLINE_FETCH_ERROR_MESSAGE);
  }

  const startedAt = now();

  try {
    const response = await fetchImpl(input, init);
    const completedAt = now();

    if (!browserOnline) {
      store.setOffline();
      return response;
    }

    if (response.ok) {
      store.noteRequestSuccess({
        latencyMs: completedAt - startedAt,
        syncedAt: completedAt,
      });
    }

    return response;
  } catch (error) {
    if (!browserOnline) {
      store.setOffline();
    }

    throw error;
  }
}

function isMutationMethod(method: string) {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}
