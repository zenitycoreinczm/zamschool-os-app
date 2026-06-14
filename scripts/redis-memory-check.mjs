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
    process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
}

loadEnvLocal();

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL missing in .env.local");
  process.exit(1);
}

const { default: Redis } = await import("ioredis");
const useTls = process.env.REDIS_TLS === "true" || url.startsWith("rediss:");
const client = new Redis(url, useTls ? { tls: {} } : {});

try {
  const pong = await client.ping();
  console.log("PING:", pong);

  for (const key of ["maxmemory", "maxmemory-policy", "used_memory_human"]) {
    try {
      const value = await client.config("GET", key);
      console.log(`${key}:`, value?.[1] ?? value);
    } catch {
      console.log(`${key}: (not available on managed Redis — set in Redis Cloud dashboard)`);
    }
  }

  const dbSize = await client.dbsize();
  console.log("keys:", dbSize);
} finally {
  await client.quit();
}