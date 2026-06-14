const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const token = process.env.SUPABASE_MGMT_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const migrationPath = resolve(__dirname, "migrations", "022_expanded_roles.sql");

async function main() {
  const sql = readFileSync(migrationPath, "utf8").trim();

  console.log("Applying 022_expanded_roles.sql via Supabase Management API...");
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Migration failed:", response.status, errorText);
    process.exit(1);
  }

  console.log("Migration applied successfully!");
}

main().catch(console.error);
