import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const componentPath = resolve(process.cwd(), "components", "DetailPanel.tsx");
const adminNotificationsPagePath = resolve(process.cwd(), "app", "app", "notifications", "page.tsx");
const adminAnnouncementsPagePath = resolve(process.cwd(), "app", "app", "announcements", "page.tsx");
const adminEventsPagePath = resolve(process.cwd(), "app", "app", "events", "page.tsx");

test("detail panel component provides a shared slide-over shell", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /export default function DetailPanel/);
  assert.match(source, /fixed inset-0/);
  assert.match(source, /onClose/);
});

test("admin notifications page opens inbox items inside the shared detail panel", async () => {
  const source = await readFile(adminNotificationsPagePath, "utf8");

  assert.match(source, /NotificationsInboxView/);
  assert.match(source, /onMarkRead/);
  assert.match(source, /onMarkAllRead/);
});

test("admin announcements page is self-contained", async () => {
  const source = await readFile(adminAnnouncementsPagePath, "utf8");

  assert.match(source, /Announcements/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});

test("admin events page is self-contained", async () => {
  const source = await readFile(adminEventsPagePath, "utf8");

  assert.match(source, /EventCalendar/);
  assert.doesNotMatch(source, /from.*@\/app\/\(dashboard\)/);
});
