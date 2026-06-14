import type { WorkspaceContextData } from "@/lib/workspace-context-client";

export type ShellData = WorkspaceContextData & {
  shell: Record<string, unknown>;
};

type ShellResponse = {
  success?: boolean;
  data?: ShellData;
  error?: string;
};

const SHELL_TTL_MS = 30_000;

let cachedShell: { expiresAt: number; data: ShellData } | null = null;
let shellPromise: Promise<ShellData> | null = null;

export function readCachedShell(): ShellData | null {
  if (!cachedShell) return null;
  if (Date.now() >= cachedShell.expiresAt) {
    cachedShell = null;
    return null;
  }
  return cachedShell.data;
}

export function invalidateShell() {
  cachedShell = null;
  shellPromise = null;
}

export async function fetchShell(options: { force?: boolean; token?: string } = {}): Promise<ShellData> {
  if (!options.force) {
    const cached = readCachedShell();
    if (cached) return cached;
  }

  if (!options.force && shellPromise) return shellPromise;

  shellPromise = requestShell(options.token)
    .then((data) => {
      cachedShell = { expiresAt: Date.now() + SHELL_TTL_MS, data };
      return data;
    })
    .finally(() => {
      shellPromise = null;
    });

  return shellPromise;
}

async function requestShell(token?: string): Promise<ShellData> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/account/shell", { headers });
  const body: ShellResponse = await res.json();

  if (!res.ok || !body.data) {
    throw new Error(body.error || "Failed to load shell");
  }

  return body.data;
}
