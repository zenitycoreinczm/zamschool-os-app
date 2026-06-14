const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

const dbConfig = {
  host: process.env.SUPABASE_DB_HOST || "aws-1-eu-west-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT) || 6543,
  user: process.env.SUPABASE_DB_USER || "postgres.jnnroitaftfmclegbeac",
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false }
};

async function runSqlFile(client, filePath) {
  console.log(`Reading SQL file: ${path.basename(filePath)}...`);
  let sql = fs.readFileSync(filePath, "utf8");

  // Prepend search path set to public and filter out CREATE EXTENSION statements if any
  sql = "SET search_path = public;\n" + sql.replace(/CREATE\s+EXTENSION\s+[^;]+;/gi, '');

  console.log(`Executing SQL file: ${path.basename(filePath)}...`);
  await client.query(sql);
  console.log(`Successfully executed: ${path.basename(filePath)}`);
}

async function main() {
  if (!dbConfig.password) {
    console.error("ERROR: SUPABASE_DB_PASSWORD env var is required.");
    process.exit(1);
  }
  const client = new Client(dbConfig);
  await client.connect();
  console.log("Connected to Supabase PostgreSQL database successfully.");

  try {
    // Drop functions that might have conflicting return types/signatures
    console.log("Dropping existing functions to prevent signature conflicts...");
    await client.query(`
      DROP FUNCTION IF EXISTS get_my_role() CASCADE;
      DROP FUNCTION IF EXISTS get_my_school_id() CASCADE;
      DROP FUNCTION IF EXISTS is_admin_role() CASCADE;
      DROP FUNCTION IF EXISTS is_payments_role() CASCADE;
    `);
    console.log("Conflict functions dropped.");

    // 1. Run schema.sql (optional - skip if not found)
    const schemaCandidates = [
      path.resolve(__dirname, "schema.sql"),
      path.resolve(__dirname, "..", "..", "schema.sql"),
    ];
    const finalSchemaPath = schemaCandidates.find(p => fs.existsSync(p));
    if (finalSchemaPath) {
      await runSqlFile(client, finalSchemaPath);
    } else {
      console.log("No schema.sql found, skipping base schema step.");
    }

    // 2. Run run_this_in_supabase_sql_editor.sql
    const migrationsDir = path.resolve(__dirname, "..", "..", "migrations");
    const mainMigrationPath = path.resolve(migrationsDir, "run_this_in_supabase_sql_editor.sql");
    await runSqlFile(client, mainMigrationPath);

    // 3. Run incremental migrations 003 to 035
    const migrationFiles = [
      "003_add_payments_role.sql",
      "004_add_notification_dedupe_key.sql",
      "005_add_profile_first_login_flags.sql",
      "006_repair_attendance_rollcall_constraint.sql",
      "007_add_notifications_dedupe_constraint.sql",
      "008_add_result_publish_columns.sql",
      "009_sync_triggers.sql",
      "010_harden_rls_policies.sql",
      "011_cleanup_legacy_rls_policies.sql",
      "012_add_teacher_assignment_tables.sql",
      "013_fix_attendance_session_identity.sql",
      "014_add_assignment_submissions.sql",
      "015_add_fee_billing_tables.sql",
      "016_grant_rls_helper_function_execute.sql",
      "017_grant_authenticated_table_privileges.sql",
      "018_security_alignment_hardening.sql",
      "019_add_file_attachments.sql",
      "020_add_student_teacher_role_tables.sql",
      "021_super_admin_and_access_codes.sql",
      "022_expanded_roles.sql",
      "023_master_plan_roles_and_invitations.sql",
      "023a_fix_staff_invitations_missing_columns.sql",
      "024_master_plan_auth_hardening.sql",
      "025_fix_profiles_schools_tenant_rls.sql",
      "025_master_plan_auth_rls_policies.sql",
      "025_revoke_anon_rls_helper_execute.sql",
      "026_academic_tenant_rls_policies.sql",
      "026_finance_tenant_rls_policies.sql",
      "027_read_path_indexes.sql",
      "028_announcements_target_audience.sql",
      "029_cleanup_duplicate_indexes_and_test_alter.sql",
      "030_normalize_message_participant_ids.sql",
      "031_dashboard_stats_view.sql",
      "032_profile_avatars_bucket.sql",
      "033_profile_avatars_private.sql",
      "034_audit_logs_jsonb_columns.sql",
      "035_staff_invitations_complete_columns.sql"
    ];

    const migrationsBase = fs.existsSync(path.resolve(__dirname, "..", "..", "migrations"))
      ? path.resolve(__dirname, "..", "..", "migrations")
      : path.resolve(__dirname, "migrations");

    for (const file of migrationFiles) {
      const filePath = path.resolve(migrationsBase, file);
      await runSqlFile(client, filePath);
    }

    console.log("\nAll schemas and migrations have been successfully applied to the database!");
  } catch (error) {
    console.error("Migration execution failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
