import { isSlowNetworkLatency } from "./offline-support.ts";

export type NetworkStatus = "online" | "slow" | "offline";

export type NetworkStatusSnapshot = {
  status: NetworkStatus;
  lastSyncedAt: number | null;
  lastLatencyMs: number | null;
};

type RequestSuccessInput = {
  latencyMs: number;
  syncedAt?: number;
};

type NetworkStatusListener = () => void;

export function createNetworkStatusStore(initial?: Partial<NetworkStatusSnapshot>) {
  let snapshot: NetworkStatusSnapshot = {
    status: initial?.status || "online",
    lastSyncedAt: initial?.lastSyncedAt ?? null,
    lastLatencyMs: initial?.lastLatencyMs ?? null,
  };
  const listeners = new Set<NetworkStatusListener>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener: NetworkStatusListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOffline() {
      snapshot = {
        ...snapshot,
        status: "offline",
      };
      emit();
    },
    setOnline() {
      snapshot = {
        ...snapshot,
        status: "online",
      };
      emit();
    },
    noteRequestSuccess({ latencyMs, syncedAt = Date.now() }: RequestSuccessInput) {
      snapshot = {
        status: isSlowNetworkLatency(latencyMs) ? "slow" : "online",
        lastSyncedAt: syncedAt,
        lastLatencyMs: latencyMs,
      };
      emit();
    },
  };
}

export const networkStatusStore = createNetworkStatusStore();

export function getNetworkStatusSnapshot() {
  return networkStatusStore.getSnapshot();
}

export function subscribeToNetworkStatus(listener: NetworkStatusListener) {
  return networkStatusStore.subscribe(listener);
}

export function setNetworkOffline() {
  networkStatusStore.setOffline();
}

export function setNetworkOnline() {
  networkStatusStore.setOnline();
}

export function noteNetworkRequestSuccess(input: RequestSuccessInput) {
  networkStatusStore.noteRequestSuccess(input);
}
