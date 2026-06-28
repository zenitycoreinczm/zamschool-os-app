import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ─── FORCE RLS migration coverage test ─────────────────────────────────────
//
// Verifies that the force-RLS migration exists and covers every table
// that has ENABLE ROW LEVEL SECURITY in the baseline.

const migrationsDir = "supabase/migrations";
const baselinePath = join(migrationsDir, "00000000000000_baseline.sql");
const baseline = readFileSync(baselinePath, "utf8");

// Extract all tables that ENABLE RLS in the baseline
const enableTables = [
  ...baseline.matchAll(
    /ALTER TABLE IF EXISTS public\.(\w+) ENABLE ROW LEVEL SECURITY/g,
  ),
].map((m) => m[1]);

// Extract tables that FORCE RLS in the baseline
const baselineForceTables = new Set(
  [...baseline.matchAll(
    /ALTER TABLE IF EXISTS public\.(\w+) FORCE ROW LEVEL SECURITY/g,
  )].map((m) => m[1]),
);

// Find the force-RLS migration
const migrationFiles = readdirSync(migrationsDir).filter(
  (f) => f.endsWith(".sql") && f !== "00000000000000_baseline.sql",
);

const forceMigrationFile = migrationFiles.find((f) =>
  /force.*rls|rls.*force/i.test(f),
);

test("a FORCE RLS migration file exists", () => {
  assert.ok(
    forceMigrationFile,
    "Expected a migration file with 'force' and 'rls' in the name",
  );
});

if (forceMigrationFile) {
  const migrationContent = readFileSync(
    join(migrationsDir, forceMigrationFile),
    "utf8",
  );

  const migratedForceTables = new Set(
    [...migrationContent.matchAll(
      /ALTER TABLE IF EXISTS public\.(\w+) FORCE ROW LEVEL SECURITY/g,
    )].map((m) => m[1]),
  );

  test("every ENABLE RLS table is covered by FORCE RLS across baseline + migration", () => {
    const allForced = new Set([...baselineForceTables, ...migratedForceTables]);
    const missing = enableTables.filter((t) => !allForced.has(t));
    assert.deepEqual(
      missing,
      [],
      `These tables have ENABLE but no FORCE RLS: ${missing.join(", ")}`,
    );
  });

  test(`FORCE RLS migration covers at least ${enableTables.length - baselineForceTables.size} tables`, () => {
    assert.ok(
      migratedForceTables.size >= enableTables.length - baselineForceTables.size,
      `Migration should FORCE RLS on at least ${enableTables.length - baselineForceTables.size} tables, got ${migratedForceTables.size}`,
    );
  });
}
