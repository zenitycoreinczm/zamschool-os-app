import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pagePath = resolve(process.cwd(), "app", "app", "admin", "timetable", "page.tsx");

test("admin timetable page exposes flexible time suggestions instead of a restrictive native picker", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /buildTimeChoices/);
  assert.match(source, /TimeField/);
  assert.match(source, /07:00/);
});
