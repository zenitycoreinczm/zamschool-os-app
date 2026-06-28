/**
 * Local migration contract check (no live DB required).
 *
 * Usage:
 *   node scripts/schema-check.mjs
 *   node scripts/schema-check.mjs --strict
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const strict = process.argv.includes("--strict");
const projectRoot = process.cwd();
const migrationsDir = resolve(projectRoot, "supabase", "migrations");

const requiredTables = [
  "schools",
  "profiles",
  "students",
  "teachers",
  "parents",
  "classes",
  "subjects",
  "attendance",
  "assignments",
  "assignment_submissions",
  "results",
  "messages",
  "notifications",
  "audit_logs",
];

function listMigrationFiles() {
  if (!statSync(migrationsDir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  return readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();
}

const migrationFiles = listMigrationFiles();
const migrationSql = migrationFiles
  .map((entry) => readFileSync(join(migrationsDir, entry), "utf8"))
  .join("\n\n");

const missingTables = requiredTables.filter((table) => {
  const pattern = new RegExp(
    `create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(?:public\\.)?["']?${table}["']?\\b`,
    "i",
  );
  return !pattern.test(migrationSql);
});

const duplicateNames = migrationFiles.filter(
  (name, index, list) => list.indexOf(name) !== index,
);

const hasBaseline = migrationFiles.some((entry) =>
  /baseline/i.test(entry),
);

const createTableMatches = [...migrationSql.matchAll(
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_]+)["']?\s/gi,
)].map((match) => match[1].toLowerCase());

const uniqueTables = [...new Set(createTableMatches)];
const rlsEnabledCount = (
  migrationSql.match(/enable\s+row\s+level\s+security/gi) || []
).length;

const tablesMissingRls = uniqueTables.filter((table) => {
  const rlsPattern = new RegExp(
    `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?["']?${table}["']?\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  );
  return !rlsPattern.test(migrationSql);
});

const result = {
  ok:
    migrationFiles.length > 0 &&
    hasBaseline &&
    missingTables.length === 0 &&
    duplicateNames.length === 0 &&
    tablesMissingRls.length === 0,
  migrationCount: migrationFiles.length,
  migrationFiles,
  hasBaseline,
  tableCount: uniqueTables.length,
  rlsEnabledStatements: rlsEnabledCount,
  missingTables,
  duplicateNames,
  tablesMissingRls,
};

console.log(JSON.stringify(result, null, 2));

if (strict && !result.ok) {
  process.exit(1);
}
