import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const swPath = resolve(process.cwd(), "public", "sw.js");
const offlinePagePath = resolve(process.cwd(), "app", "offline", "page.tsx");

test("service worker uses cached fallback strategies for the curated offline core", async () => {
  const source = await readFile(swPath, "utf8");

  assert.match(source, /STATIC_CACHE/);
  assert.match(source, /ROUTE_CACHE/);
  assert.match(source, /API_CACHE/);
  assert.match(source, /OFFLINE_FALLBACK_URL/);
  assert.match(source, /networkFirst/);
  assert.match(source, /staleWhileRevalidate/);
});

test("offline fallback page exists for uncached offline navigations", async () => {
  const source = await readFile(offlinePagePath, "utf8");

  assert.match(source, /offline/i);
  assert.match(source, /Reconnect/i);
});
