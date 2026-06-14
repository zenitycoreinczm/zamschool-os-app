/**
 * Apply only storage RLS policy statements from migration 033 (bucket already private).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)\./)?.[1] ||
  "jnnroitaftfmclegbeac";

const policySql = `
DROP POLICY IF EXISTS "profile_avatars_public_read" ON storage.objects;

DROP POLICY IF EXISTS "profile_avatars_select_same_school" ON storage.objects;
CREATE POLICY "profile_avatars_select_same_school"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
    LIMIT 1
  )
);
`;

const password = process.env.SUPABASE_DB_PASSWORD;
const configs = [
  {
    host: "aws-1-eu-west-1.pooler.supabase.com",
    port: 6543,
    user: `postgres.${ref}`,
    label: "pooler-session-6543",
  },
  {
    host: "aws-1-eu-west-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${ref}`,
    label: "pooler-session-5432",
  },
];

async function main() {
  if (!password) {
    console.error("SUPABASE_DB_PASSWORD missing");
    process.exit(1);
  }

  for (const cfg of configs) {
    const client = new pg.Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password,
      database: process.env.SUPABASE_DB_NAME || "postgres",
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`Connected (${cfg.label})`);
      await client.query(policySql);
      const policies = await client.query(
        `SELECT policyname FROM pg_policies
         WHERE schemaname = 'storage' AND tablename = 'objects'
           AND policyname LIKE 'profile_avatars%'
         ORDER BY policyname`
      );
      console.log("Policies:", policies.rows.map((r) => r.policyname).join(", "));
      await client.end();
      return;
    } catch (err) {
      console.warn(`${cfg.label}: ${err.message}`);
      await client.end().catch(() => undefined);
    }
  }

  process.exit(1);
}

main();