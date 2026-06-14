import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");
const projectRoot = process.cwd();
const migrationsDir = resolve(projectRoot, "migrations");
const schemaPath = resolve(projectRoot, "schema.sql");

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

const schema = readFileSync(schemaPath, "utf8");
const sqlFiles = readdirSync(migrationsDir)
  .filter((entry) => entry.endsWith(".sql"))
  .sort();
const migrations = sqlFiles.filter((entry) => /^\d{3}_.+\.sql$/.test(entry));
const migrationSql = migrations
  .map((entry) => readFileSync(resolve(migrationsDir, entry), "utf8"))
  .join("\n\n");
const schemaContract = `${schema}\n\n${migrationSql}`;

const missingTables = requiredTables.filter((table) => {
  const pattern = new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\b`, "i");
  return !pattern.test(schemaContract);
});

const duplicateMigrationNumbers = migrations
  .map((entry) => entry.match(/^(\d{3})/)?.[1])
  .filter(Boolean)
  .filter((number, index, list) => list.indexOf(number) !== index);
const aggregateMigrations = sqlFiles.filter((entry) => !migrations.includes(entry));

const result = {
  ok: missingTables.length === 0 && duplicateMigrationNumbers.length === 0,
  migrationCount: migrations.length,
  missingTables,
  duplicateMigrationNumbers,
  aggregateMigrations,
};

console.log(JSON.stringify(result, null, 2));

if (strict && !result.ok) {
  process.exit(1);
}
