const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  const lines = envContent.split('\n');
  for (const line of lines) {
    line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, value] = line.split('=');
      process.env[key.trim()] = value.trim();
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationPath = resolve(process.cwd(), "migrations", "023_master_plan_roles_and_invitations.sql");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

if (!existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

async function main() {
  let sql = readFileSync(migrationPath, "utf8").trim();
  if (!sql) {
    console.log("Migration file is empty; nothing to apply.");
    return;
  }

  // Prepend search path set to public, and filter out CREATE EXTENSION statements if any
  sql = "SET search_path = public;\n" + sql.replace(/CREATE\s+EXTENSION\s+[^;]+;/gi, '');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Applying migration 023_master_plan_roles_and_invitations.sql...");
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Migration application failed:", error.message);
    process.exit(1);
  }

  console.log("Migration applied successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
