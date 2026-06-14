/**
 * Apply migrations/033_profile_avatars_private.sql to live Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

async function verify(client) {
  const bucket = await client.query(
    "SELECT id, public FROM storage.buckets WHERE id = 'profile-avatars'"
  );
  const policies = await client.query(
    `SELECT policyname FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname LIKE 'profile_avatars%'
     ORDER BY policyname`
  );

  console.log("\nVerification:");
  console.log("  bucket:", bucket.rows[0] ?? "(missing)");
  console.log("  policies:", policies.rows.map((row) => row.policyname).join(", ") || "(none)");

  const isPrivate = bucket.rows[0]?.public === false;
  const hasSchoolPolicy = policies.rows.some(
    (row) => row.policyname === "profile_avatars_select_same_school"
  );
  const hasPublicRead = policies.rows.some(
    (row) => row.policyname === "profile_avatars_public_read"
  );

  if (!isPrivate || !hasSchoolPolicy || hasPublicRead) {
    throw new Error("Migration verification failed — bucket or policies not as expected.");
  }
}

async function main() {
  const configs = buildConfigs();
  if (!configs[0]?.password) {
    console.error("SUPABASE_DB_PASSWORD is not set in .env.local");
    process.exit(1);
  }

  const sqlPath = path.join(migrationsDir, "033_profile_avatars_private.sql");
  const sql = `SET search_path = public;\n${fs.readFileSync(sqlPath, "utf8")}`;

  let client;
  let lastErr;
  for (const cfg of configs) {
    const { label, ...conn } = cfg;
    const attempt = new Client(conn);
    try {
      await attempt.connect();
      client = attempt;
      console.log(`Connected via ${label} (project ${ref})`);
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
    console.log("Applying 033_profile_avatars_private.sql...");
    await client.query(sql);
    await verify(client);
    console.log("\nMigration 033 applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});