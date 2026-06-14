const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schemaPath = resolve(process.cwd(), "schema.sql");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

async function main() {
  let sql = readFileSync(schemaPath, "utf8").trim();
  if (!sql) {
    console.log("Schema file is empty; nothing to apply.");
    return;
  }

  // Prepend search path set to public, and filter out CREATE EXTENSION statements
  sql = "SET search_path = public;\n" + sql.replace(/CREATE\s+EXTENSION\s+[^;]+;/gi, '');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Applying base schema.sql (with public search path)...");
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Schema application failed:", error.message);
    process.exit(1);
  }

  console.log("Base schema applied successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
