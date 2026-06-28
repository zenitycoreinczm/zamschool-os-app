import { importTsModule } from "../../../scripts/test-ts-module.mjs";

const { verifyAuth, signTestJwt } = await importTsModule("./auth.ts", import.meta.url);

import test from "node:test";
import assert from "node:assert/strict";
const TEST_SECRET = "test-jwt-secret-for-unit-tests";

function createKv() {
  const store = new Map();
  return {
    store,
    async get(key, options) {
      const value = store.get(key);
      if (!value) return null;
      if (options?.type === "json") {
        return JSON.parse(value);
      }
      return value;
    },
    async put(key, value, _options) {
      store.set(key, typeof value === "string" ? value : JSON.stringify(value));
    },
  };
}

function createEnv(overrides = {}) {
  return {
    SESSION_CACHE: createKv(),
    SUPABASE_JWT_SECRET: TEST_SECRET,
    JWT_VERIFY_MODE: "signature",
    SUPABASE_JWT_AUDIENCE: "authenticated",
    ...overrides,
  };
}

test("verifyAuth accepts valid HS256 Supabase-style JWT", async () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = await signTestJwt(TEST_SECRET, {
    sub: "user-1",
    role: "authenticated",
    aud: "authenticated",
    email: "teacher@school.test",
    exp,
    user_metadata: { school_id: "school-1" },
  });

  const env = createEnv();
  const session = await verifyAuth(
    new Request("https://gateway.test/api/student/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env
  );

  assert.ok(session);
  assert.equal(session.userId, "user-1");
  assert.equal(session.schoolId, "school-1");
  assert.equal(session.role, "authenticated");
});

test("verifyAuth rejects tampered JWT signature", async () => {
  const token = await signTestJwt(TEST_SECRET, {
    sub: "user-1",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  // Tamper the *payload*, not the signature, so the HMAC is guaranteed to fail.
  // Mutating only the last base64url char of the signature has a ~1/64 chance
  // of producing a valid HMAC for the original payload — that's a flaky test.
  const [headerPart, , signaturePart] = token.split(".");
  const tamperedPayload = btoa(
    JSON.stringify({
      sub: "user-1",
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_metadata: { school_id: "attacker-school" },
    }),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const tampered = `${headerPart}.${tamperedPayload}.${signaturePart}`;

  const env = createEnv();
  const session = await verifyAuth(
    new Request("https://gateway.test/api/student/dashboard", {
      headers: { Authorization: `Bearer ${tampered}` },
    }),
    env
  );

  assert.equal(session, null);
});

test("verifyAuth rejects expired JWT", async () => {
  const token = await signTestJwt(TEST_SECRET, {
    sub: "user-1",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) - 60,
  });

  const env = createEnv();
  const session = await verifyAuth(
    new Request("https://gateway.test/api/student/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env
  );

  assert.equal(session, null);
});

test("verifyAuth rejects decode mode without ALLOW_INSECURE_JWT_DECODE", async () => {
  const token = await signTestJwt(TEST_SECRET, {
    sub: "user-1",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const env = createEnv({
    SUPABASE_JWT_SECRET: "",
    JWT_VERIFY_MODE: "decode",
    ALLOW_INSECURE_JWT_DECODE: "false",
  });

  const session = await verifyAuth(
    new Request("https://gateway.test/api/student/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env
  );

  assert.equal(session, null);
});

test("verifyAuth allows decode mode only with explicit insecure flag", async () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = await signTestJwt(TEST_SECRET, {
    sub: "user-2",
    aud: "authenticated",
    exp,
    user_metadata: { school_id: "school-2" },
  });

  const env = createEnv({
    SUPABASE_JWT_SECRET: "",
    JWT_VERIFY_MODE: "decode",
    ALLOW_INSECURE_JWT_DECODE: "true",
  });

  const session = await verifyAuth(
    new Request("https://gateway.test/api/student/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env
  );

  assert.ok(session);
  assert.equal(session.userId, "user-2");
});
