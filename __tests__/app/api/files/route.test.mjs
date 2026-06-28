import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/api/files/authorize-upload/route.ts", "utf8");
const legacyUploadSource = readFileSync(
  "app/api/files/upload/route.ts",
  "utf8",
);
const deleteSource = readFileSync("app/api/files/delete/route.ts", "utf8");

test("upload authorization route enforces authenticated actor and file validation", () => {
  assert.match(source, /requireActorContext/);
  assert.match(source, /validateFileUpload/);
  assert.match(source, /ALLOWED_ENTITY_TYPES/);
});

test("upload authorization route generates scoped R2 keys server-side", () => {
  assert.match(source, /buildKey\(/);
  assert.doesNotMatch(source, /formData\.get\(["']path["']\)/);
  assert.doesNotMatch(source, /body\.path/);
});

test("legacy upload route delegates key authorization to the canonical authorize endpoint", () => {
  assert.match(
    legacyUploadSource,
    /new URL\("\/api\/files\/authorize-upload", req\.url\)/,
  );
  assert.match(legacyUploadSource, /authorizeResponse\.ok/);
  assert.match(legacyUploadSource, /authorization\.key/);
  assert.doesNotMatch(legacyUploadSource, /buildKey\(/);
  assert.doesNotMatch(legacyUploadSource, /validateFileUpload\(/);
});

test("file delete route only deletes private uploads within the actor tenant", () => {
  assert.match(
    deleteSource,
    /requireFeatureAccess\(access\.context, "files", "delete"\)/,
  );
  assert.match(deleteSource, /bucket !== "uploads"/);
  assert.match(deleteSource, /normalizedKey\.includes\("\.\."\)/);
  assert.match(
    deleteSource,
    /normalizedKey\.startsWith\(`\$\{access\.context\.schoolId\}\/`\)/,
  );
  assert.match(deleteSource, /deleteFile\(normalizedKey, "uploads"\)/);
});
