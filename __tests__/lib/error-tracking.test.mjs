import test from "node:test";
import assert from "node:assert/strict";

import { captureError, captureMessage } from "../../lib/error-tracking.ts";

const ORIG_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIG_ENV);
}

test("captureError is non-throwing for Error instances", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureError(new Error("test error"), { module: "test" });
  });
  restoreEnv();
});

test("captureError is non-throwing for non-Error values", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureError("string error", { module: "test" });
  });
  assert.doesNotThrow(() => {
    captureError(null, { module: "test" });
  });
  assert.doesNotThrow(() => {
    captureError({ code: 500, detail: "fail" }, { module: "test" });
  });
  restoreEnv();
});

test("captureError is non-throwing with empty context", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureError(new Error("no context"));
  });
  restoreEnv();
});

test("captureError is non-throwing in production without SENTRY_DSN", () => {
  process.env.NODE_ENV = "production";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureError(new Error("prod no sentry"), { module: "payments" });
  });
  restoreEnv();
});

test("captureError is non-throwing in production with SENTRY_DSN (Sentry not installed)", () => {
  process.env.NODE_ENV = "production";
  process.env.SENTRY_DSN = "https://fake@example.com/1";
  assert.doesNotThrow(() => {
    captureError(new Error("prod with sentry dsn"), { module: "payments" });
  });
  restoreEnv();
});

test("captureMessage is non-throwing", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureMessage("test message", { module: "test" });
  });
  restoreEnv();
});

test("captureMessage is non-throwing in production without SENTRY_DSN", () => {
  process.env.NODE_ENV = "production";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureMessage("prod message", { module: "test" });
  });
  restoreEnv();
});

test("captureError does not throw when context contains complex nested objects", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SENTRY_DSN;
  assert.doesNotThrow(() => {
    captureError(new Error("complex"), {
      module: "test",
      nested: { a: { b: { c: [1, 2, 3] } } },
      array: [1, "two", { three: true }],
    });
  });
  restoreEnv();
});
