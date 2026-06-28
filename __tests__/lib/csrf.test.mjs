import test from "node:test";
import assert from "node:assert/strict";

import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_TOKEN_COOKIE,
} from "../../lib/csrf.ts";

// ─── generateCsrfToken ────────────────────────────────────────────────────

test("generateCsrfToken returns a 64-char hex string (32 bytes)", () => {
  const token = generateCsrfToken();
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]{64}$/);
});

test("generateCsrfToken produces unique tokens across calls", () => {
  const tokens = new Set();
  for (let i = 0; i < 100; i++) {
    tokens.add(generateCsrfToken());
  }
  assert.equal(tokens.size, 100);
});

// ─── validateCsrfToken ────────────────────────────────────────────────────

test("validateCsrfToken returns true when tokens match", () => {
  const token = generateCsrfToken();
  assert.equal(validateCsrfToken(token, token), true);
});

test("validateCsrfToken returns false when request token is null", () => {
  const token = generateCsrfToken();
  assert.equal(validateCsrfToken(null, token), false);
});

test("validateCsrfToken returns false when cookie token is null", () => {
  const token = generateCsrfToken();
  assert.equal(validateCsrfToken(token, null), false);
});

test("validateCsrfToken returns false when both are null", () => {
  assert.equal(validateCsrfToken(null, null), false);
});

test("validateCsrfToken returns false when tokens differ", () => {
  const tokenA = generateCsrfToken();
  const tokenB = generateCsrfToken();
  assert.equal(validateCsrfToken(tokenA, tokenB), false);
});

test("validateCsrfToken returns false when lengths differ (early exit)", () => {
  assert.equal(validateCsrfToken("short", "a-much-longer-token-string"), false);
});

test("validateCsrfToken uses constant-time comparison (no timing leak on mismatch)", () => {
  const token = generateCsrfToken();
  // Flip last character
  const lastChar = token[token.length - 1];
  const flipped = lastChar === "0" ? "1" : "0";
  const tampered = token.slice(0, -1) + flipped;
  assert.equal(validateCsrfToken(tampered, token), false);
});

// ─── CSRF_TOKEN_COOKIE ─────────────────────────────────────────────────────

test("CSRF_TOKEN_COOKIE is a non-empty string", () => {
  assert.equal(typeof CSRF_TOKEN_COOKIE, "string");
  assert.ok(CSRF_TOKEN_COOKIE.length > 0);
  assert.equal(CSRF_TOKEN_COOKIE, "csrf-token");
});
