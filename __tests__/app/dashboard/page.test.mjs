import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const appDashboardPath = resolve(process.cwd(), "app", "app", "dashboard", "page.tsx");

test("app dashboard page imports dashboard components correctly", async () => {
  const source = await readFile(appDashboardPath, "utf8");

  assert.match(source, /SchoolAdminDashboard/);
  assert.match(source, /DashboardSummaryProvider/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});
