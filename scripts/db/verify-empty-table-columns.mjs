import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnnroitaftfmclegbeac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubnJvaXRhZnRmbWNsZWdiZWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU4MTAxMiwiZXhwIjoyMDg4MTU3MDEyfQ.Q1L4vCsm0SUeMO6b75Vp3NAlA2CaUZ_AsbJ1esB4UaA'
);

async function checkColumns(tableName, columns) {
  const results = {};
  for (const col of columns) {
    const { error } = await supabase.from(tableName).select(col).limit(0);
    results[col] = error ? `✗ ${error.message.substring(0, 60)}` : '✓';
  }
  return results;
}

async function main() {
  console.log('=== EMPTY TABLE COLUMN VERIFICATION ===\n');

  // access_codes - from 023 migration
  console.log('--- access_codes ---');
  const accCols = await checkColumns('access_codes', [
    'code', 'max_uses', 'use_count', 'province', 'district',
    'school_type', 'ownership_type', 'notes', 'expires_at',
    'used_at', 'used_by_email', 'created_by', 'created_at'
  ]);
  Object.entries(accCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- staff_invitations ---');
  const invCols = await checkColumns('staff_invitations', [
    'id', 'school_id', 'invited_by', 'email', 'role',
    'department', 'position', 'first_name', 'last_name', 'phone',
    'token', 'temporary_password', 'expires_at', 'accepted_at',
    'accepted_by', 'revoked_at', 'created_at', 'updated_at'
  ]);
  Object.entries(invCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- user_sessions ---');
  const sessCols = await checkColumns('user_sessions', [
    'id', 'user_id', 'school_id', 'auth_session_id',
    'device_name', 'device_type', 'browser', 'os',
    'ip_address', 'location', 'is_active', 'last_active_at',
    'terminated_at', 'created_at'
  ]);
  Object.entries(sessCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- school_departments ---');
  const deptCols = await checkColumns('school_departments', [
    'id', 'school_id', 'name', 'description', 'head_of_department',
    'is_default', 'created_at', 'updated_at'
  ]);
  Object.entries(deptCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- permission_groups ---');
  const pgCols = await checkColumns('permission_groups', [
    'id', 'school_id', 'name', 'description', 'is_system', 'created_at', 'updated_at'
  ]);
  Object.entries(pgCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- permission_group_roles ---');
  const pgrCols = await checkColumns('permission_group_roles', [
    'id', 'school_id', 'group_id', 'role', 'created_at'
  ]);
  Object.entries(pgrCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- permission_features ---');
  const pfCols = await checkColumns('permission_features', [
    'id', 'school_id', 'group_id', 'feature_key',
    'can_create', 'can_read', 'can_update', 'can_delete',
    'scope', 'created_at'
  ]);
  Object.entries(pfCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- school_settings ---');
  const ssCols = await checkColumns('school_settings', [
    'id', 'school_id', 'setting_key', 'setting_value', 'created_at', 'updated_at'
  ]);
  Object.entries(ssCols).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n=== VERIFICATION COMPLETE ===');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });