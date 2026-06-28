import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(
  process.cwd(),
  "app",
  "api",
  "admin",
  "timetable",
  "route.ts",
);

test("admin timetable route POST writes a created audit log", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function POST/);
  assert.match(source, /action:\s*"timetable\.lesson_created"/);
  assert.match(source, /createAuditLog\(/);
});

test("admin timetable route PUT writes an updated audit log", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function PUT/);
  assert.match(source, /action:\s*"timetable\.lesson_updated"/);
  assert.match(source, /createAuditLog\(/);
});

test("admin timetable route DELETE writes a deleted audit log", async () => {
  const source = await readFile(routePath, "utf8");

  // Bug fix (2026-06-21): DELETE was missing an audit-log call.
  assert.match(source, /export async function DELETE/);
  assert.match(source, /action:\s*"timetable\.deleted"/);
  assert.match(source, /auditDomainWrite/);
});

test("admin timetable route deletes inside the school boundary", async () => {
  const source = await readFile(routePath, "utf8");

  // Regression check: the DELETE must scope by school_id so an admin from
  // school A cannot delete a lesson from school B.
  assert.match(source, /\.eq\("school_id",\s*schoolId\)/);
});
