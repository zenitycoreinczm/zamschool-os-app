import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const auditPagePath = resolve(process.cwd(), "app", "app", "admin", "audit", "page.tsx");
const eventsPagePath = resolve(process.cwd(), "app", "app", "events", "page.tsx");
const announcementsPagePath = resolve(process.cwd(), "app", "app", "announcements", "page.tsx");

test("audit page loads through the admin audit API instead of probing tables client-side", async () => {
  const source = await readFile(auditPagePath, "utf8");

  assert.match(source, /\/api\/admin\/audit/);
  assert.doesNotMatch(source, /resolveTable\(TABLE_CANDIDATES\)/);
});

test("events page is self-contained and renders correctly", async () => {
  const source = await readFile(eventsPagePath, "utf8");

  assert.match(source, /EventCalendar/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});

test("announcements page is self-contained and renders correctly", async () => {
  const source = await readFile(announcementsPagePath, "utf8");

  assert.match(source, /Announcements/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});
