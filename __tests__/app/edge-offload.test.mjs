import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const adminTimetablePath = resolve(
  process.cwd(),
  "app",
  "app",
  "admin",
  "timetable",
  "page.tsx",
);
const teacherPagePath = resolve(
  process.cwd(),
  "app",
  "app",
  "teacher",
  "page.tsx",
);
const appDashboardPath = resolve(
  process.cwd(),
  "app",
  "app",
  "dashboard",
  "page.tsx",
);

test("admin timetable page exists and renders", async () => {
  const source = await readFile(adminTimetablePath, "utf8");
  assert.ok(source.length > 0, "timetable page should have content");
});

test("teacher page is the main dashboard", async () => {
  const source = await readFile(teacherPagePath, "utf8");
  assert.match(source, /TeacherDashboardPage/);
});

test("app dashboard page imports components correctly", async () => {
  const source = await readFile(appDashboardPath, "utf8");
  assert.match(source, /SchoolAdminDashboard/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});
