import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/discipline-admin/page.tsx", "utf8");

test("discipline-admin page uses shared browser api helper for same-origin api calls", () => {
  assert.match(source, /adminApiJson/);
  assert.doesNotMatch(
    source,
    /fetch\("\/api\/discipline\/records",\s*\{\s*method:\s*"POST"/,
  );
});
