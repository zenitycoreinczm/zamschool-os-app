import test from "node:test";
import assert from "node:assert/strict";

import { logger, sanitizeContext, shouldLog } from "../../lib/logger.ts";

const ORIG_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIG_ENV);
}

// ─── sanitizeContext ──────────────────────────────────────────────────────

test("sanitizeContext redacts keys matching secret/password/token/key/authorization", () => {
  const result = sanitizeContext({
    api_key: "sk-secret123",
    password: "hunter2",
    accessToken: "tok-abc",
    authorization: "Bearer xyz",
    normalField: "visible",
    count: 42,
  });
  assert.equal(result.api_key, "[REDACTED]");
  assert.equal(result.password, "[REDACTED]");
  assert.equal(result.accessToken, "[REDACTED]");
  assert.equal(result.authorization, "[REDACTED]");
  assert.equal(result.normalField, "visible");
  assert.equal(result.count, 42);
});

test("sanitizeContext converts Error values to their message", () => {
  const result = sanitizeContext({ error: new Error("DB down") });
  assert.equal(result.error, "DB down");
});

test("sanitizeContext drops undefined values", () => {
  const result = sanitizeContext({ a: 1, b: undefined, c: "x" });
  assert.equal(result.a, 1);
  assert.equal(result.b, undefined);
  assert.equal(result.c, "x");
  assert.deepEqual(Object.keys(result).sort(), ["a", "c"]);
});

// ─── shouldLog ────────────────────────────────────────────────────────────

test("shouldLog respects LOG_LEVEL env var", () => {
  process.env.LOG_LEVEL = "warn";
  assert.equal(shouldLog("debug"), false);
  assert.equal(shouldLog("info"), false);
  assert.equal(shouldLog("warn"), true);
  assert.equal(shouldLog("error"), true);
  restoreEnv();
});

test("shouldLog defaults to debug in non-production", () => {
  process.env.NODE_ENV = "development";
  delete process.env.LOG_LEVEL;
  assert.equal(shouldLog("debug"), true);
  assert.equal(shouldLog("info"), true);
  assert.equal(shouldLog("warn"), true);
  assert.equal(shouldLog("error"), true);
  restoreEnv();
});

test("shouldLog defaults to info in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.LOG_LEVEL;
  assert.equal(shouldLog("debug"), false);
  assert.equal(shouldLog("info"), true);
  assert.equal(shouldLog("warn"), true);
  assert.equal(shouldLog("error"), true);
  restoreEnv();
});

// ─── logger API ────────────────────────────────────────────────────────────

test("logger has debug/info/warn/error methods", () => {
  assert.equal(typeof logger.debug, "function");
  assert.equal(typeof logger.info, "function");
  assert.equal(typeof logger.warn, "function");
  assert.equal(typeof logger.error, "function");
});

test("logger.child returns a logger with merged context", () => {
  process.env.NODE_ENV = "production";
  delete process.env.LOG_LEVEL;

  const messages = [];
  const origStdout = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => {
    const line = String(chunk).trim();
    if (line.startsWith("{")) {
      try { JSON.parse(line); messages.push(line); } catch {}
    }
    return true;
  };

  const childLogger = logger.child({ module: "payments", schoolId: "sch-1" });
  childLogger.info("payment.recorded", { studentId: "stu-1" });

  process.stdout.write = origStdout;
  restoreEnv();

  assert.equal(messages.length, 1);
  const parsed = JSON.parse(messages[0]);
  assert.equal(parsed.module, "payments");
  assert.equal(parsed.schoolId, "sch-1");
  assert.equal(parsed.studentId, "stu-1");
  assert.equal(parsed.message, "payment.recorded");
  assert.equal(parsed.level, "info");
  assert.ok(parsed.timestamp);
});

test("logger.error writes to stderr in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.LOG_LEVEL;

  const messages = [];
  const origStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk) => {
    const line = String(chunk).trim();
    if (line.startsWith("{")) {
      try { JSON.parse(line); messages.push(line); } catch {}
    }
    return true;
  };

  logger.error("test.error", { detail: "fail" });

  process.stderr.write = origStderr;
  restoreEnv();

  assert.equal(messages.length, 1);
  const parsed = JSON.parse(messages[0]);
  assert.equal(parsed.level, "error");
  assert.equal(parsed.message, "test.error");
  assert.equal(parsed.detail, "fail");
});

test("logger respects LOG_LEVEL and skips lower-priority messages", () => {
  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "error";

  const stdoutMessages = [];
  const stderrMessages = [];
  const origStdout = process.stdout.write.bind(process.stdout);
  const origStderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (chunk) => {
    const line = String(chunk).trim();
    if (line.startsWith("{")) { try { JSON.parse(line); stdoutMessages.push(line); } catch {} }
    return true;
  };
  process.stderr.write = (chunk) => {
    const line = String(chunk).trim();
    if (line.startsWith("{")) { try { JSON.parse(line); stderrMessages.push(line); } catch {} }
    return true;
  };

  logger.info("skipped.info");
  logger.warn("skipped.warn");
  logger.error("emitted.error");

  process.stdout.write = origStdout;
  process.stderr.write = origStderr;
  restoreEnv();

  assert.equal(stdoutMessages.length, 0);
  assert.equal(stderrMessages.length, 1);
  const parsed = JSON.parse(stderrMessages[0]);
  assert.equal(parsed.message, "emitted.error");
});
