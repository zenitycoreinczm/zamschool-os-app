import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const helperPath = resolve(process.cwd(), "lib", "gateway-read-client.ts");
const teacherBootstrapClientPath = resolve(
  process.cwd(),
  "lib",
  "teacher-bootstrap-client.ts",
);
const accountProfileClientPath = resolve(
  process.cwd(),
  "lib",
  "account-profile-client.ts",
);

test("gateway read helper acquires a Supabase access token and falls back to local routes", async () => {
  const source = await readFile(helperPath, "utf8");

  assert.match(source, /NEXT_PUBLIC_GATEWAY_URL/);
  assert.match(source, /supabase\.auth\.getSession/);
  assert.match(source, /Authorization/);
  assert.match(source, /fetchGatewayRead/);
  assert.match(source, /fallbackToLocal/);
  assert.match(source, /cleanHeaders\.delete\("Authorization"\)/i);
  assert.match(source, /cleanHeaders\.delete\("authorization"\)/i);
});

test("hot read clients use the shared gateway read helper", async () => {
  const [teacherBootstrapSource, accountProfileSource] = await Promise.all([
    readFile(teacherBootstrapClientPath, "utf8"),
    readFile(accountProfileClientPath, "utf8"),
  ]);

  assert.match(teacherBootstrapSource, /fetchGatewayRead/);
  assert.match(accountProfileSource, /fetchGatewayRead/);
});
