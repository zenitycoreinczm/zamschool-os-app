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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function test() {
  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql: "SELECT current_user AS user;" });
    if (error) throw error;
    console.log("Result:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();