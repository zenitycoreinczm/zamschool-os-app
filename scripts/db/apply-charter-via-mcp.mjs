/**
 * Apply charter migrations 027–028 via Supabase MCP (Grok OAuth).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mcpScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "mcp-supabase-call.mjs");

const MIGRATIONS = [
  { name: "charter_read_path_indexes", file: "027_read_path_indexes.sql" },
  { name: "charter_announcements_target_audience", file: "028_announcements_target_audience.sql" },
];

function callMcp(tool, args) {
  const r = spawnSync(process.execPath, [mcpScript, tool, JSON.stringify(args)], {
    encoding: "utf8",
    cwd: root,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `MCP call failed: ${tool}`);
  }
  return JSON.parse(r.stdout);
}

async function main() {
  for (const mig of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(root, "migrations", mig.file), "utf8");
    console.log(`Applying ${mig.name} (${mig.file})...`);
    const out = callMcp("apply_migration", { name: mig.name, query: sql });
    const text = out?.content?.[0]?.text ?? JSON.stringify(out);
    if (/error|failed/i.test(text) && !/already exists/i.test(text)) {
      console.log(text);
    } else {
      console.log(`OK: ${mig.name}`);
    }
  }

  const verify = callMcp("execute_sql", {
    query: `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_audience'`,
  });
  const verifyText = verify?.content?.[0]?.text ?? "";
  console.log("\nVerification:", verifyText);

  const indexes = callMcp("execute_sql", {
    query: `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
      AND indexname IN ('idx_profiles_auth_user_id','idx_announcements_school_audience')`,
  });
  console.log("Indexes:", indexes?.content?.[0]?.text ?? "");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});