const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationPath = resolve(__dirname, "migrations", "022_expanded_roles.sql");

async function main() {
  const sql = readFileSync(migrationPath, "utf8").trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  console.log("Applying 022_expanded_roles.sql...");
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Migration failed via exec_sql:", error.message);
    process.exit(1);
  }
  console.log("Migration applied successfully!");
}

main().catch(console.error);
