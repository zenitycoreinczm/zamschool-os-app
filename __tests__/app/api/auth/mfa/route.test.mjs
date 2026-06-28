import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const mfaRoutes = [
  "app/api/auth/mfa/enroll/route.ts",
  "app/api/auth/mfa/verify/route.ts",
  "app/api/auth/mfa/challenge/route.ts",
  "app/api/auth/mfa/factors/route.ts",
];

for (const route of mfaRoutes) {
  test(`MFA route ${route} uses fail-closed auth rate limiting`, async () => {
    const source = await readFile(resolve(process.cwd(), route), "utf8");
    assert.match(source, /applyAuthApiRateLimit/);
    assert.doesNotMatch(source, /failOpen:\s*true/);
  });
}

test("MFA enroll route validates required fields and returns QR code", async () => {
  const source = await readFile(resolve(process.cwd(), "app/api/auth/mfa/enroll/route.ts"), "utf8");
  assert.match(source, /factorType.*totp/);
  assert.match(source, /issuer.*ZamSchool/);
  assert.match(source, /friendlyName/);
  assert.match(source, /qr_code/);
  assert.match(source, /secret/);
});

test("MFA verify route validates factorId, challengeId, and code", async () => {
  const source = await readFile(resolve(process.cwd(), "app/api/auth/mfa/verify/route.ts"), "utf8");
  assert.match(source, /factorId.*z\.string/);
  assert.match(source, /challengeId.*z\.string/);
  assert.match(source, /code.*z\.string/);
  assert.match(source, /mfa\.verify/);
  assert.match(source, /mfa_enrolled.*true/);
});

test("MFA challenge route requires factorId and returns challengeId", async () => {
  const source = await readFile(resolve(process.cwd(), "app/api/auth/mfa/challenge/route.ts"), "utf8");
  assert.match(source, /factorId.*z\.string/);
  assert.match(source, /mfa\.challenge/);
  assert.match(source, /challengeId/);
});

test("MFA factors route supports GET and DELETE", async () => {
  const source = await readFile(resolve(process.cwd(), "app/api/auth/mfa/factors/route.ts"), "utf8");
  assert.match(source, /export async function GET/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /listFactors/);
  assert.match(source, /unenroll/);
  assert.match(source, /factorId.*query parameter/);
});