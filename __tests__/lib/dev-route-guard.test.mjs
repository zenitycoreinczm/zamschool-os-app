import test from "node:test";
import assert from "node:assert/strict";

import { requireUnsafeLocalDevRoute } from "../../lib/dev-route-guard.ts";

const ORIG_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIG_ENV);
}

function makeReq(host = "localhost", headers = {}) {
  const req = new Request(`http://${host}:3000/api/debug/env`);
  for (const [k, v] of Object.entries(headers)) {
    req.headers.set(k, v);
  }
  return req;
}

test("dev-route-guard returns 404 when NODE_ENV is not development", () => {
  process.env.NODE_ENV = "production";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(makeReq());
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard returns 404 when ENABLE_UNSAFE_DEV_ROUTES is not set", () => {
  process.env.NODE_ENV = "development";
  delete process.env.ENABLE_UNSAFE_DEV_ROUTES;
  const result = requireUnsafeLocalDevRoute(makeReq());
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard returns 404 when ENABLE_UNSAFE_DEV_ROUTES is false", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "false";
  const result = requireUnsafeLocalDevRoute(makeReq());
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard allows localhost when both env flags are set", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(makeReq("localhost"));
  assert.equal(result, null);
  restoreEnv();
});

test("dev-route-guard allows 127.0.0.1 when both env flags are set", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(makeReq("127.0.0.1"));
  assert.equal(result, null);
  restoreEnv();
});

test("dev-route-guard blocks non-loopback host even with env flags set", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(makeReq("evil.example.com"));
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard blocks spoofed x-forwarded-host header", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(
    makeReq("localhost", { "x-forwarded-host": "evil.example.com" }),
  );
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard blocks spoofed x-forwarded-for header", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(
    makeReq("localhost", { "x-forwarded-for": "203.0.113.1" }),
  );
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard blocks spoofed x-real-ip header", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(
    makeReq("localhost", { "x-real-ip": "203.0.113.1" }),
  );
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard allows chained loopback x-forwarded-for", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(
    makeReq("localhost", { "x-forwarded-for": "127.0.0.1, ::1" }),
  );
  assert.equal(result, null);
  restoreEnv();
});

test("dev-route-guard blocks when any chained x-forwarded-for is non-loopback", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(
    makeReq("localhost", { "x-forwarded-for": "127.0.0.1, 203.0.113.1" }),
  );
  assert.equal(result?.status, 404);
  restoreEnv();
});

test("dev-route-guard allows IPv6 loopback [::1]", () => {
  process.env.NODE_ENV = "development";
  process.env.ENABLE_UNSAFE_DEV_ROUTES = "true";
  const result = requireUnsafeLocalDevRoute(makeReq("[::1]"));
  assert.equal(result, null);
  restoreEnv();
});
