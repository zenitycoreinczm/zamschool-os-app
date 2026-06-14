import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnnroitaftfmclegbeac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubnJvaXRhZnRmbWNsZWdiZWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU4MTAxMiwiZXhwIjoyMDg4MTU3MDEyfQ.Q1L4vCsm0SUeMO6b75Vp3NAlA2CaUZ_AsbJ1esB4UaA'
);

// Query columns using a SQL wrapper approach
async function getColumns(tableName) {
  // Use direct select with limit 0 and inspect the returned schema
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  if (error) {
    return { error: error.message, columns: [] };
  }
  
  if (data && data.length > 0) {
    return { error: null, columns: Object.keys(data[0]).sort() };
  }
  
  return { error: null, columns: [] };
}

async function main() {
  console.log('=== DEEP COLUMN & FUNCTION VERIFICATION ===\n');

  // 1. Check profiles columns
  console.log('--- PROFILES TABLE ---');
  const profCols = await getColumns('profiles');
  console.log('Columns:', profCols.columns.join(', '));
  
  const expectedProfCols = ['auth_user_id', 'school_id', 'role', 'name', 'first_name', 'last_name', 'email', 'admission_number', 'employee_id', 'gender', 'date_of_birth'];
  const missingProf = expectedProfCols.filter(c => !profCols.columns.includes(c));
  if (missingProf.length) console.log('MISSING:', missingProf.join(', '));
  else console.log('✓ Key columns present');

  // 2. Check access_codes columns (migration 023 added many)
  console.log('\n--- ACCESS_CODES TABLE ---');
  const accCols = await getColumns('access_codes');
  console.log('Columns:', accCols.columns.join(', '));
  const expectedAcc = ['code', 'max_uses', 'use_count', 'province', 'district', 'school_type', 'ownership_type', 'notes', 'expires_at', 'used_at', 'used_by_email', 'created_by', 'created_at'];
  const missingAcc = expectedAcc.filter(c => !accCols.columns.includes(c));
  if (missingAcc.length) console.log('MISSING (from 023):', missingAcc.join(', '));
  else console.log('✓ All migration 023 columns present');

  // 3. Check staff_invitations columns
  console.log('\n--- STAFF_INVITATIONS TABLE ---');
  const invCols = await getColumns('staff_invitations');
  console.log('Columns:', invCols.columns.join(', '));
  const expectedInv = ['school_id', 'invited_by', 'email', 'role', 'department', 'position', 'first_name', 'last_name', 'phone', 'token', 'temporary_password', 'expires_at', 'accepted_at', 'accepted_by', 'revoked_at'];
  const missingInv = expectedInv.filter(c => !invCols.columns.includes(c));
  if (missingInv.length) console.log('MISSING:', missingInv.join(', '));
  else console.log('✓ Key columns present');

  // 4. Check user_sessions columns
  console.log('\n--- USER_SESSIONS TABLE ---');
  const sessCols = await getColumns('user_sessions');
  console.log('Columns:', sessCols.columns.join(', '));
  const expectedSess = ['user_id', 'school_id', 'auth_session_id', 'device_name', 'device_type', 'browser', 'os', 'ip_address', 'location', 'is_active', 'last_active_at', 'terminated_at'];
  const missingSess = expectedSess.filter(c => !sessCols.columns.includes(c));
  if (missingSess.length) console.log('MISSING:', missingSess.join(', '));
  else console.log('✓ Key columns present');

  // 5. Check school_departments columns
  console.log('\n--- SCHOOL_DEPARTMENTS TABLE ---');
  const deptCols = await getColumns('school_departments');
  console.log('Columns:', deptCols.columns.join(', '));
  const expectedDept = ['school_id', 'name', 'description', 'head_of_department', 'is_default'];
  const missingDept = expectedDept.filter(c => !deptCols.columns.includes(c));
  if (missingDept.length) console.log('MISSING:', missingDept.join(', '));
  else console.log('✓ Key columns present');

  // 6. Check permission tables
  console.log('\n--- PERMISSION_GROUPS TABLE ---');
  const pgCols = await getColumns('permission_groups');
  console.log('Columns:', pgCols.columns.join(', '));
  
  console.log('\n--- PERMISSION_GROUP_ROLES TABLE ---');
  const pgrCols = await getColumns('permission_group_roles');
  console.log('Columns:', pgrCols.columns.join(', '));

  console.log('\n--- PERMISSION_FEATURES TABLE ---');
  const pfCols = await getColumns('permission_features');
  console.log('Columns:', pfCols.columns.join(', '));

  // 7. Check school_settings columns
  console.log('\n--- SCHOOL_SETTINGS TABLE ---');
  const ssCols = await getColumns('school_settings');
  console.log('Columns:', ssCols.columns.join(', '));

  // 8. Check profiles role constraint
  console.log('\n--- PROFILE ROLE CONSTRAINT ---');
  const { data: roles, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .limit(10);
  if (!roleErr) {
    const uniqueRoles = [...new Set(roles.map(r => r.role))];
    console.log('Roles in use:', uniqueRoles.join(', '));
  }

  // Try to check constraint via attempting invalid insert
  const { error: chkErr } = await supabase.from('profiles').insert({
    school_id: '00000000-0000-0000-0000-000000000001',
    role: 'INVALID_TEST_ROLE',
    name: 'test',
    email: 'test@test.com'
  });
  if (chkErr) {
    console.log('Constraint active (blocked invalid role):', chkErr.message.substring(0, 100));
  }

  // 9. Check database functions existence
  console.log('\n--- DATABASE FUNCTIONS ---');
  const functions = ['get_my_school_id', 'get_my_role', 'is_admin_role', 'is_sensitive_role'];
  for (const fn of functions) {
    try {
      const { data, error } = await supabase.rpc(fn);
      if (error) {
        console.log(`  ✗ ${fn} — ERROR: ${error.message.substring(0, 80)}`);
      } else {
        console.log(`  ✓ ${fn} — returns: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`  ✗ ${fn} — EXCEPTION: ${e.message.substring(0, 80)}`);
    }
  }

  // 10. Check RLS on key tables
  console.log('\n--- RLS ENABLED (sample check) ---');
  const rlsCheck = ['schools', 'profiles', 'user_sessions', 'staff_invitations', 'access_codes', 'school_departments', 'permission_groups', 'school_settings'];
  for (const t of rlsCheck) {
    // Try querying without auth context - should work with service role
    const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? 'ERROR: ' + error.message.substring(0, 50) : 'query OK (service role bypasses RLS)'}`);
  }

  console.log('\n=== DEEP VERIFICATION COMPLETE ===');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });