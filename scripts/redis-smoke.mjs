import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL missing");
  process.exit(1);
}

const { default: Redis } = await import("ioredis");
const useTls =
  process.env.REDIS_TLS === "true" ||
  (process.env.REDIS_TLS !== "false" && url.startsWith("rediss:"));
const client = new Redis(url, useTls ? { tls: {} } : {});

try {
  const pong = await client.ping();
  console.log("Redis PING:", pong);
  await client.set("tmp:smoke:test", "ok", "EX", 10);
  const value = await client.get("tmp:smoke:test");
  console.log("Redis SET/GET:", value);
  await client.del("tmp:smoke:test");
} finally {
  await client.quit();
}