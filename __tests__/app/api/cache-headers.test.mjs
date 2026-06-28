import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const routes = [
  "app/api/account/announcements/route.ts",
  "app/api/parent/children/route.ts",
  "app/api/admin/announcements/route.ts",
  "app/api/dashboard/summary/route.ts",
  "app/api/dashboard/academic-scope/route.ts",
  "app/api/admin/attendance/summary/route.ts",
  "app/api/admin/events/route.ts",
  "app/api/admin/payments/route.ts",
];

for (const route of routes) {
  test(`${route} uses shared edge cache headers`, () => {
    const source = readFileSync(route, "utf8");

    assert.match(source, /applyEdgeCacheHeaders/);
    assert.doesNotMatch(source, /headers\.set\(["']Cache-Control["']/);
    assert.doesNotMatch(source, /headers:\s*\{\s*["']Cache-Control["']/);
  });
}
