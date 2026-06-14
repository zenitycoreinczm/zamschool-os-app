/**
 * Apply avatar privacy via Supabase Storage API + SQL (when DB is reachable).
 * Falls back to bucket privacy if SQL cannot connect.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(projectUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = fs.readFileSync(
  path.join(root, "migrations", "033_profile_avatars_private.sql"),
  "utf8"
);

async function makeBucketPrivate() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const bucket = buckets?.find((item) => item.id === "profile-avatars" || item.name === "profile-avatars");
  if (!bucket) {
    throw new Error("profile-avatars bucket not found");
  }

  const { data, error } = await supabase.storage.updateBucket("profile-avatars", {
    public: false,
    fileSizeLimit: bucket.file_size_limit ?? 65536,
    allowedMimeTypes: bucket.allowed_mime_types ?? ["image/webp", "image/jpeg", "image/png"],
  });

  if (error) throw error;
  return data;
}

async function trySqlPolicies() {
  const ref =
    process.env.SUPABASE_PROJECT_REF ||
    projectUrl.match(/https:\/\/([^.]+)\./)?.[1] ||
    "jnnroitaftfmclegbeac";
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return false;

  const poolerUser = `postgres.${ref}`;
  const attempts = [
    { host: "aws-1-eu-west-1.pooler.supabase.com", port: 6543, user: poolerUser },
    { host: "aws-1-eu-west-1.pooler.supabase.com", port: 5432, user: poolerUser },
  ];

  for (const attempt of attempts) {
    const client = new pg.Client({
      ...attempt,
      password,
      database: process.env.SUPABASE_DB_NAME || "postgres",
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`Connected for SQL via ${attempt.host}:${attempt.port}`);
      await client.query(`SET search_path = public;\n${sql}`);
      await client.end();
      return true;
    } catch (err) {
      console.warn(`  SQL connect failed (${attempt.host}:${attempt.port}): ${err.message}`);
      await client.end().catch(() => undefined);
    }
  }

  return false;
}

async function verify() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const bucket = buckets?.find((item) => item.name === "profile-avatars");
  console.log("\nBucket after update:", {
    name: bucket?.name,
    public: bucket?.public,
  });
  if (bucket?.public !== false) {
    throw new Error("Bucket is still public");
  }
}

async function main() {
  console.log("Updating profile-avatars bucket to private...");
  await makeBucketPrivate();
  console.log("Bucket set to private.");

  const sqlOk = await trySqlPolicies();
  if (sqlOk) {
    console.log("Storage RLS policies applied via SQL.");
  } else {
    console.warn(
      "Could not apply storage RLS policies via Postgres (network/auth). Bucket is private; app serves avatars via /api/account/avatar/media."
    );
  }

  await verify();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});