/**
 * Live Supabase audit (RLS, views, role helpers).
 * Reads credentials from .env.local — never prints secrets.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = process.env.SUPABASE_PROJECT_REF || refMatch?.[1] || "unknown";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUMMARY_VIEWS = [
  "student_dashboard_summary",
  "parent_children_summary",
  "teacher_workspace_summary",
  "admin_workspace_summary",
];

const CORE_TABLES = [
  "schools",
  "profiles",
  "students",
  "teachers",
  "classes",
  "announcements",
  "results",
  "attendance",
  "notifications",
  "student_fees",
];

const V1_SCOPE_TABLES = [
  "student_pulse_metrics",
  "teacher_alerts",
  "class_insights",
  "classroom_activity_stream",
  "student_risk_assessments",
  "teacher_performance_metrics",
];

async function tableExists(name) {
  const { error } = await admin.from(name).select("*", { head: true, count: "exact" });
  if (!error) return { exists: true, error: null };
  const msg = error.message || "";
  if (msg.includes("does not exist") || msg.includes("Could not find")) {
    return { exists: false, error: msg };
  }
  return { exists: true, error: msg };
}

async function viewReadable(name) {
  const { data, error } = await admin.from(name).select("*").limit(1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, sampleRows: Array.isArray(data) ? data.length : 0 };
}

async function runSql(query) {
  const attempts = [
    () => admin.rpc("exec_sql", { sql: query }),
    () => admin.rpc("sql", { query }),
  ];
  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) return { ok: true, data };
  }
  return { ok: false, data: null };
}

async function auditRlsViaPostgres() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return { ok: false, reason: "no_password" };

  let pg;
  try {
    pg = await import("pg");
  } catch {
    return { ok: false, reason: "pg_not_installed" };
  }

  const profiles = [
    {
      label: "env",
      host: process.env.SUPABASE_DB_HOST,
      port: Number(process.env.SUPABASE_DB_PORT) || 5432,
      user: process.env.SUPABASE_DB_USER || "postgres",
    },
    {
      label: "direct",
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: "postgres",
    },
    {
      label: "pooler",
      host: process.env.SUPABASE_DB_HOST_POOLER || "aws-1-eu-west-1.pooler.supabase.com",
      port: 6543,
      user: `postgres.${projectRef}`,
    },
  ];

  let client;
  let connectedAs = "";
  for (const profile of profiles) {
    if (!profile.host) continue;
    const candidate = new pg.default.Client({
      host: profile.host,
      port: profile.port,
      user: profile.user,
      password,
      database: process.env.SUPABASE_DB_NAME || "postgres",
      ssl: { rejectUnauthorized: false },
    });
    try {
      await candidate.connect();
      client = candidate;
      connectedAs = `${profile.label} (${profile.host}:${profile.port})`;
      break;
    } catch {
      await candidate.end().catch(() => {});
    }
  }

  if (!client) {
    return { ok: false, reason: "postgres_auth_failed" };
  }

  try {
    console.log(`  Postgres connected via ${connectedAs}`);

    const rlsResult = await client.query(`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             COALESCE(p.policy_count, 0)::int AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN (
        SELECT tablename, COUNT(*)::int AS policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
      ) p ON p.tablename = c.relname
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY(ARRAY[
          'schools','profiles','students','teachers','classes','announcements',
          'results','attendance','notifications','student_fees','messages','events',
          'assignments','exams','payments','fees','markbook_sheets','parents',
          'parent_students','staff_invitations','permission_groups'
        ])
      ORDER BY c.relname;
    `);

    const fnResult = await client.query(`
      SELECT p.proname AS name
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('is_admin_role', 'get_my_school_id', 'get_my_role', 'is_payments_role')
      ORDER BY p.proname;
    `);

    const rlsGaps = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN (
        SELECT tablename, COUNT(*)::int AS policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
      ) p ON p.tablename = c.relname
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
        AND COALESCE(p.policy_count, 0) = 0
      ORDER BY c.relname
      LIMIT 25;
    `);

    const viewDefs = await client.query(`
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname = ANY(ARRAY[
          'student_dashboard_summary','parent_children_summary',
          'teacher_workspace_summary','admin_workspace_summary'
        ])
      ORDER BY viewname;
    `);

    return {
      ok: true,
      rls: rlsResult.rows,
      functions: fnResult.rows.map((r) => r.name),
      rlsGaps: rlsGaps.rows.map((r) => r.table_name),
      views: viewDefs.rows.map((r) => r.viewname),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  console.log("=== ZamSchool OS — Live Supabase Audit ===\n");
  console.log(`Project ref: ${projectRef}`);
  console.log(`URL: ${url.replace(/\/\/[^@]+@/, "//***@")}`);
  console.log(`Service role: configured`);
  console.log(`DB password in env: ${process.env.SUPABASE_DB_PASSWORD ? "yes" : "no"}`);
  console.log(`Mgmt token in env: ${process.env.SUPABASE_MGMT_TOKEN ? "yes" : "no"}\n`);

  const { error: pingErr } = await admin.from("schools").select("id", { head: true, count: "exact" });
  if (pingErr) {
    console.error("Connection failed:", pingErr.message);
    process.exit(1);
  }
  console.log("Connection: OK\n");

  console.log("--- Summary views ---");
  for (const view of SUMMARY_VIEWS) {
    const r = await viewReadable(view);
    console.log(`  ${view}: ${r.ok ? "readable" : "missing/error — " + r.error}`);
  }

  console.log("\n--- Core tables (existence) ---");
  for (const table of CORE_TABLES) {
    const r = await tableExists(table);
    console.log(`  ${table}: ${r.exists ? "exists" : "missing"}${r.error && !r.exists ? "" : ""}`);
  }

  console.log("\n--- V1 scope-creep tables (exist in DB, not in app code) ---");
  for (const table of V1_SCOPE_TABLES) {
    const r = await tableExists(table);
    console.log(`  ${table}: ${r.exists ? "present" : "absent"}`);
  }

  const pgAudit = await auditRlsViaPostgres();
  if (pgAudit.ok) {
    console.log("\n--- RLS on critical tables (direct Postgres) ---");
    for (const row of pgAudit.rls) {
      const flag =
        row.rls_enabled && row.policy_count > 0
          ? "OK"
          : row.rls_enabled && row.policy_count === 0
            ? "RLS ON, NO POLICIES"
            : "RLS OFF";
      console.log(`  ${row.table_name}: ${flag} (policies: ${row.policy_count})`);
    }
    console.log("\n--- Auth helper functions ---");
    console.log(`  ${pgAudit.functions.join(", ") || "(none found)"}`);
    if (pgAudit.rlsGaps.length) {
      console.log("\n--- Tables with RLS enabled but ZERO policies (sample) ---");
      for (const name of pgAudit.rlsGaps) {
        console.log(`  ${name}`);
      }
    } else {
      console.log("\n--- No RLS-enabled tables without policies (in sample) ---");
    }
    console.log("\n--- Registered summary views in pg_views ---");
    console.log(`  ${pgAudit.views.join(", ") || "(none)"}`);
  } else {
    console.log("\n--- RLS on critical tables ---");
    console.log(
      `  Postgres audit skipped: ${pgAudit.reason || "unknown"} (set SUPABASE_DB_PASSWORD or npm install pg)`
    );
  }

  const { count: profileCount } = await admin
    .from("profiles")
    .select("*", { head: true, count: "exact" });
  const { data: roleRows } = await admin.from("profiles").select("role");
  const roleDist = {};
  for (const row of roleRows || []) {
    const key = String(row.role || "unknown").toLowerCase();
    roleDist[key] = (roleDist[key] || 0) + 1;
  }
  console.log("\n--- Profiles snapshot ---");
  console.log(`  Total profiles: ${profileCount ?? "?"}`);
  console.log(`  Role distribution: ${JSON.stringify(roleDist)}`);

  const { data: annRow, error: annColErr } = await admin
    .from("announcements")
    .select("id, target_audience, audience, target_role")
    .limit(1);
  console.log("\n--- Announcements charter column ---");
  if (annColErr?.message?.includes("target_audience")) {
    console.log("  target_audience: missing (apply migration 028)");
  } else if (annRow?.length) {
    console.log(`  target_audience column: present`);
    console.log(`  legacy audience column: ${annRow[0].audience != null ? "present" : "n/a"}`);
  } else {
    console.log("  (no announcement rows to sample)");
  }

  console.log("\n--- Summary view schemas (first row keys) ---");
  for (const view of SUMMARY_VIEWS) {
    const { data, error } = await admin.from(view).select("*").limit(1);
    if (error) {
      console.log(`  ${view}: error`);
      continue;
    }
    const keys = data?.[0] ? Object.keys(data[0]).join(", ") : "(empty view)";
    console.log(`  ${view}: ${keys}`);
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log("\n--- Anon key direct reads (RLS without session = expect deny) ---");
    for (const table of ["profiles", "results", "announcements", "student_fees"]) {
      const { error } = await anon.from(table).select("id").limit(1);
      const msg = error?.message || "OK (unexpected)";
      console.log(`  ${table}: ${msg.slice(0, 72)}`);
    }
  }

  console.log("\n=== Audit complete ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});