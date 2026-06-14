const STORAGE_KEY = "zamschool_login_cooldown";

export function buildLoginCooldown(retryAfterSeconds: number | string | null | undefined, now = Date.now()) {
  const safeSeconds = Math.max(0, Math.ceil(Number(retryAfterSeconds) || 0));
  const until = now + safeSeconds * 1000;

  // Persist to localStorage so it survives page refreshes
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ until }));
    } catch {
      // Ignore storage errors
    }
  }

  return { until };
}

export function getLoginCooldownState(until: number | string | null | undefined, now = Date.now()) {
  // If no until provided, try to load from localStorage
  let effectiveUntil = Number(until || 0);

  if ((!effectiveUntil || effectiveUntil <= 0) && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        effectiveUntil = Number(parsed.until || 0);
      }
    } catch {
      // Ignore storage errors
    }
  }

  const remainingMs = effectiveUntil - now;
  if (!(effectiveUntil > 0) || remainingMs <= 0) {
    // Clear expired cooldown from storage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    return {
      active: false,
      remainingSeconds: 0,
    };
  }

  return {
    active: true,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}

/** Clear any active cooldown (e.g., after successful login) */
export function clearLoginCooldown() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
