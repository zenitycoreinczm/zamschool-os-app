import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "teacher", "students", "route.ts");
const helperPath = resolve(process.cwd(), "lib", "teacher-student-intelligence.ts");

test("teacher students route exposes teacher-scoped student intelligence", async () => {
  const source = await readFile(routePath, "utf8");
  const helperSource = await readFile(helperPath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /requireTeacherContext/);
  assert.match(source, /loadTeacherStudentIntelligence/);
  assert.match(helperSource, /\briskLevel\b/);
  assert.match(helperSource, /\bclassHealth\b/);
  assert.match(helperSource, /\bflags\b/);
});
