import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "student", "results", "route.ts");

test("student results route requires student auth and filters to published own results", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /requireStudentContext/);
  assert.match(source, /published_at/);
  assert.match(source, /\.not\("published_at",\s*"is",\s*null\)/);
  assert.match(source, /student_id/);
});
