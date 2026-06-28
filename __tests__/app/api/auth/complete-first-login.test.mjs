import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/api/auth/complete-first-login/route.ts", "utf8");

test("complete-first-login supports bearer or same-origin cookie auth", () => {
  assert.match(source, /resolveVerifiedBearerUser/);
  assert.match(source, /resolveVerifiedAuthUser/);
  assert.match(source, /createClient\(/);
  assert.match(source, /resolveFirstLoginUser/);
});

test("complete-first-login still rejects malformed authorization headers", () => {
  assert.match(source, /Invalid authorization header/);
  assert.match(source, /readBearerToken/);
});

test("complete-first-login remains rate limited and clears managed first-login state", () => {
  assert.match(source, /applyAuthApiRateLimit/);
  assert.match(source, /clearFirstLoginState/);
  assert.match(source, /must_change_password/);
});
