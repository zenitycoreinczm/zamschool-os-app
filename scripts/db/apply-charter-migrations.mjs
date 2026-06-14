/**
 * Apply charter migrations 027–028 to live Supabase via direct Postgres.
 * Requires SUPABASE_DB_PASSWORD in .env.local (or env).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = path.join(root, "migrations");

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)\./)?.[1] ||
  "jnnroitaftfmclegbeac";

function buildConfigs() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const database = process.env.SUPABASE_DB_NAME || "postgres";
  const poolerUser = `postgres.${ref}`;
  const envHost = process.env.SUPABASE_DB_HOST;
  const envPort = Number(process.env.SUPABASE_DB_PORT) || 5432;
  const envUser = process.env.SUPABASE_DB_USER || "postgres";

  const configs = [];
  const poolerHosts = [
    "aws-1-eu-west-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
  ];
  for (const host of poolerHosts) {
    for (const port of [5432, 6543]) {
      configs.push({
        host,
        port,
        user: poolerUser,
        password,
        database,
        ssl: { rejectUnauthorized: false },
        label: `pooler:${host}:${port}`,
      });
    }
  }

  if (envHost) {
    configs.push({
      host: envHost,
      port: envPort,
      user: envUser === "postgres" && envHost.includes("pooler") ? poolerUser : envUser,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      label: "env",
    });
  }

  return configs;
}

const FILES = ["027_read_path_indexes.sql", "028_announcements_target_audience.sql"];

async function runFile(client, name) {
  const filePath = path.join(migrationsDir, name);
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${filePath}`);
  const sql = `SET search_path = public;\n${fs.readFileSync(filePath, "utf8")}`;
  console.log(`Applying ${name}...`);
  await client.query(sql);
  console.log(`OK: ${name}`);
}

async function verify(client) {
  const col = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'announcements'
      AND column_name = 'target_audience'
  `);
  const idx = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_profiles_auth_user_id',
        'idx_announcements_school_audience'
      )
  `);
  console.log("\nVerification:");
  console.log("  target_audience column:", col.rows.length ? "yes" : "no");
  console.log("  charter indexes found:", idx.rows.map((r) => r.indexname).join(", ") || "(none)");
}

async function main() {
  const configs = buildConfigs();
  if (!configs[0]?.password) {
    console.error(
      "SUPABASE_DB_PASSWORD is not set. Add it to .env.local or use Supabase MCP apply_migration / SQL editor."
    );
    console.error(
      `SQL editor: https://supabase.com/dashboard/project/${ref}/sql`
    );
    process.exit(1);
  }

  let client;
  let lastErr;
  for (const cfg of configs) {
    const { label, ...conn } = cfg;
    const attempt = new Client(conn);
    try {
      await attempt.connect();
      client = attempt;
      console.log(`Connected via ${label} (project ${ref})\n`);
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`  connect failed (${label}): ${err.message}`);
      await attempt.end().catch(() => {});
    }
  }

  if (!client) {
    throw lastErr || new Error("Could not connect to Supabase Postgres");
  }

  try {
    for (const file of FILES) {
      await runFile(client, file);
    }
    await verify(client);
    console.log("\nCharter migrations 027–028 applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});