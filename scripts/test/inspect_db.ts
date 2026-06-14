import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
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
  "payments",
];

async function inspectTable(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    ok: !error,
    count: count ?? null,
    error: error?.message || null,
  };
}

async function main() {
  const checks = await Promise.all(tables.map(inspectTable));
  console.log(JSON.stringify({ ok: checks.every((item) => item.ok), tables: checks }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
