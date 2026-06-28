import test from "node:test";
import assert from "node:assert/strict";

import { resolveLessonDayOfWeek } from "../../lib/lesson-day.ts";

// ─── resolveLessonDayOfWeek ──────────────────────────────────────────────
// getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat

test("resolveLessonDayOfWeek returns 0 (Sunday) for 2026-03-01", () => {
  // 2026-03-01 is a Sunday in UTC
  assert.equal(resolveLessonDayOfWeek("2026-03-01"), 0);
});

test("resolveLessonDayOfWeek returns 1 (Monday) for 2026-03-02", () => {
  assert.equal(resolveLessonDayOfWeek("2026-03-02"), 1);
});

test("resolveLessonDayOfWeek returns 5 (Friday) for 2026-03-06", () => {
  assert.equal(resolveLessonDayOfWeek("2026-03-06"), 5);
});

test("resolveLessonDayOfWeek returns 6 (Saturday) for 2026-03-07", () => {
  assert.equal(resolveLessonDayOfWeek("2026-03-07"), 6);
});

test("resolveLessonDayOfWeek returns 4 (Thursday) for 2026-01-01", () => {
  assert.equal(resolveLessonDayOfWeek("2026-01-01"), 4);
});

test("resolveLessonDayOfWeek returns current day for invalid date string", () => {
  const expected = new Date().getUTCDay();
  assert.equal(resolveLessonDayOfWeek("not-a-date"), expected);
});

test("resolveLessonDayOfWeek returns current day for empty string", () => {
  const expected = new Date().getUTCDay();
  assert.equal(resolveLessonDayOfWeek(""), expected);
});
