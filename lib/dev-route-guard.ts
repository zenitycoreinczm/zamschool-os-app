import { NextResponse } from "next/server";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "[::1]"]);

export function requireUnsafeLocalDevRoute(req: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.ENABLE_UNSAFE_DEV_ROUTES !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  if (!isLoopbackHost(url.hostname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost && !splitHeaderValues(forwardedHost).every(isLoopbackHost)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor && !splitHeaderValues(forwardedFor).every(isLoopbackIp)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && !isLoopbackIp(realIp)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return null;
}

function splitHeaderValues(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLoopbackHost(value: string) {
  return LOOPBACK_HOSTS.has(stripPort(value).toLowerCase());
}

function isLoopbackIp(value: string) {
  return LOOPBACK_IPS.has(stripPort(value).toLowerCase());
}

function stripPort(value: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return normalized;
  }

  if (normalized.startsWith("[")) {
    const end = normalized.indexOf("]");
    return end === -1 ? normalized : normalized.slice(0, end + 1);
  }

  const [host] = normalized.split(":");
  return host || normalized;
}
