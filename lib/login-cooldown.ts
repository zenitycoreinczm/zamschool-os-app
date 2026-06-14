export function buildLoginCooldown(retryAfterSeconds: number | string | null | undefined, now = Date.now()) {
  const safeSeconds = Math.max(0, Math.ceil(Number(retryAfterSeconds) || 0));
  return {
    until: now + safeSeconds * 1000,
  };
}

export function getLoginCooldownState(until: number | string | null | undefined, now = Date.now()) {
  const safeUntil = Number(until || 0);
  const remainingMs = safeUntil - now;
  if (!(safeUntil > 0) || remainingMs <= 0) {
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
