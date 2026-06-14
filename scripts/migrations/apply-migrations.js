const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationPath = resolve(process.cwd(), "migrations", "run_this_in_supabase_sql_editor.sql");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

async function main() {
  const sql = readFileSync(migrationPath, "utf8").trim();
  if (!sql) {
    console.log("Migration file is empty; nothing to apply.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Migration failed:", error.message);
    console.error("If exec_sql is unavailable, run the SQL file manually in the Supabase SQL editor.");
    process.exit(1);
  }

  console.log("Migration applied successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
