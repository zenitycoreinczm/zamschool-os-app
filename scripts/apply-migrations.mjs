/**
 * Apply migrations from the migrations/ directory to a Supabase project
 * via the Management API.
 *
 * Usage: node scripts/apply-migrations.mjs [--dry-run] [--from N]
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import process from "node:process";

const PROJECT_REF = "jnnroitaftfmclegbeac";
const MIGRATIONS_DIR = resolve(process.cwd(), "migrations");
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database`;

// Access tokens to try
const TOKENS = [];

// Try reading from supa_token.txt
try {
  const tokenPath = resolve(process.cwd(), "supa_token.txt");
  if (existsSync(tokenPath)) {
    TOKENS.push(readFileSync(tokenPath, "utf8").trim());
  }
} catch {}

// Try from .env.local
try {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    const tokenMatch = content.match(/SUPABASE_ACCESS_TOKEN=([^\s\n]+)/);
    if (tokenMatch) TOKENS.push(tokenMatch[1]);
    const dbPassMatch = content.match(/SUPABASE_DB_PASSWORD=([^\s\n]+)/);
    if (dbPassMatch) {
      // For Postgres pooler connection
      TOKENS.push(`pg:${dbPassMatch[1]}`);
    }
  }
} catch {}

// Try from .mcp.json
try {
  const mcpPath = resolve(process.cwd(), ".mcp.json");
  if (existsSync(mcpPath)) {
    const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
    const supabaseToken = mcp?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN;
    if (supabaseToken) TOKENS.push(supabaseToken);
  }
} catch {}

const dryRun = process.argv.includes("--dry-run");
const fromIndex = parseInt(
  process.argv.find((a, i) => a === "--from" && i + 1 < process.argv.length)
    ? process.argv[process.argv.indexOf("--from") + 1]
    : "1",
);

async function apiRequest(endpoint, method, body, token) {
  const url = `${API_BASE}/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `API ${method} ${endpoint} failed: ${response.status} ${text}`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function findWorkingToken() {
  for (const token of TOKENS) {
    if (!token || token.startsWith("pg:")) continue;
    console.log(`Testing token: ${token.slice(0, 15)}...`);
    try {
      const result = await apiRequest(
        "query",
        "POST",
        { query: "SELECT 1 AS ping" },
        token,
      );
      console.log("  ✓ Token works!");
      return token;
    } catch (err) {
      console.log(`  ✗ ${err.message?.slice(0, 80)}`);
    }
  }
  return null;
}

async function listAppliedMigrations(token) {
  try {
    const result = await apiRequest(
      "query",
      "POST",
      {
        query:
          "SELECT name FROM supabase_migrations.schema_migrations ORDER BY name",
      },
      token,
    );
    return (result || []).map((r) => r.name);
  } catch {
    // Table might not exist, assume no migrations applied
    return [];
  }
}

// Migrations that are covered by 039_fix_role_constraint_and_migrations.sql
const FIXED_BY_039 = new Set([
  "003_add_payments_role.sql",
  "009_sync_triggers.sql",
  "013_fix_attendance_session_identity.sql",
  "018_security_alignment_hardening.sql",
  "020_add_student_teacher_role_tables.sql",
  "021_super_admin_and_access_codes.sql",
  "022_expanded_roles.sql",
  "023_master_plan_roles_and_invitations.sql",
]);

function getMigrationFiles() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(
      (f) =>
        f.endsWith(".sql") &&
        !f.startsWith("legacy_") &&
        !f.startsWith("run_this_") &&
        f !== "038_ready_to_run.sql" &&
        !FIXED_BY_039.has(f),
    )
    .sort();

  console.log(`\nFound ${files.length} migration files:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  return files;
}

async function applyMigration(token, filename) {
  const filepath = join(MIGRATIONS_DIR, filename);
  const sql = readFileSync(filepath, "utf8").trim();

  if (!sql) {
    console.log(`  ⚠ Empty file, skipping`);
    return { success: true, skipped: true };
  }

  console.log(`  Applying (${sql.length} chars)...`);

  try {
    // Split on semicolons for potentially long migrations, but try as one statement first
    const result = await apiRequest("query", "POST", { query: sql }, token);
    console.log(`  ✓ Applied successfully`);
    return { success: true };
  } catch (err) {
    const msg = err.message || String(err);
    console.log(`  ✗ Failed: ${msg.slice(0, 100)}`);
    return { success: false, error: msg };
  }
}

async function main() {
  console.log("=== ZamSchool Migrations ===\n");
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Directory: ${MIGRATIONS_DIR}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "APPLY"}`);

  // Find working token
  console.log("\n--- Finding access token ---");
  const token = await findWorkingToken();
  if (!token) {
    console.error("\n❌ No working access token found.");
    console.error("Please set SUPABASE_ACCESS_TOKEN in .env.local");
    process.exit(1);
  }

  // List already applied migrations
  console.log("\n--- Checking applied migrations ---");
  const applied = await listAppliedMigrations(token);
  console.log(
    `Already applied: ${applied.length > 0 ? applied.join(", ") : "none"}`,
  );

  // Get migration files
  const files = getMigrationFiles();

  // Filter out already applied if migration names match
  const toApply = files.filter((f) => {
    const match = f.match(/^(\d+[a-z]?)_/);
    const name = match ? f : null;
    // We can't easily match file names to applied names, so apply all for now
    // unless the user specified --from
    return true;
  });

  // Filter by --from
  const startIndex = Math.max(0, fromIndex - 1);
  const pending = toApply.slice(startIndex);

  if (pending.length === 0) {
    console.log("\n✅ All migrations are already applied!");
    return;
  }

  console.log(
    `\n--- ${dryRun ? "Would apply" : "Applying"} ${pending.length} migration(s) ---`,
  );

  let successCount = 0;
  let failCount = 0;

  for (const file of pending) {
    console.log(`\n📄 ${file}`);

    if (dryRun) {
      const filepath = join(MIGRATIONS_DIR, file);
      const sql = readFileSync(filepath, "utf8").trim();
      console.log(`  Would run ${sql.length} chars of SQL`);
      successCount++;
      continue;
    }

    const result = await applyMigration(token, file);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total: ${pending.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
