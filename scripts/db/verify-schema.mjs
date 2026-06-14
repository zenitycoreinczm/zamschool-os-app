import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://jnnroitaftfmclegbeac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubnJvaXRhZnRmbWNsZWdiZWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU4MTAxMiwiZXhwIjoyMDg4MTU3MDEyfQ.Q1L4vCsm0SUeMO6b75Vp3NAlA2CaUZ_AsbJ1esB4UaA'
);

// Expected tables from schema.sql
const EXPECTED_TABLES = [
  'schools', 'profiles', 'grades', 'classes', 'subjects',
  'teacher_subject_specializations', 'teacher_class_subject_assignments',
  'lessons', 'attendance', 'announcements', 'results', 'audit_logs',
  'parents', 'parent_students', 'academic_years', 'terms',
  'grading_scales', 'notifications', 'events', 'messages',
  'payments', 'finance_records', 'email_verifications',
  // Phase 1 migrations added:
  'access_codes', 'staff_invitations', 'user_sessions',
  'school_departments', 'permission_groups', 'permission_group_roles',
  'permission_features', 'school_settings'
];

// Expected columns per table (key columns only for verification)
const EXPECTED_COLUMNS = {
  schools: ['id', 'name', 'code', 'address', 'logo_url', 'phone', 'email', 'emis_code', 'province', 'district', 'school_type', 'ownership_type', 'website', 'status', 'created_at', 'updated_at'],
  profiles: ['id', 'auth_user_id', 'school_id', 'role', 'name', 'first_name', 'last_name', 'email', 'phone', 'photo_url', 'status', 'must_change_password', 'temporary_password_issued_at', 'admission_number', 'employee_id', 'parent_id', 'gender', 'date_of_birth', 'grade_id', 'class_id', 'emergency_contact', 'medical_notes', 'subjects', 'classes', 'created_at', 'updated_at'],
  grades: ['id', 'school_id', 'level', 'name', 'created_at'],
  classes: ['id', 'school_id', 'grade_id', 'name', 'capacity', 'supervisor_id', 'created_at', 'updated_at'],
  subjects: ['id', 'school_id', 'name', 'code', 'created_at'],
  attendance: ['id', 'school_id', 'student_id', 'lesson_id', 'date', 'status', 'remarks', 'marked_by', 'created_at'],
  announcements: ['id', 'school_id', 'title', 'content', 'target_role', 'target_class_id', 'created_by', 'is_pinned', 'expires_at', 'created_at', 'updated_at'],
  email_verifications: ['id', 'user_id', 'email', 'otp_code', 'verified', 'expires_at', 'verified_at', 'created_at'],
  access_codes: ['id', 'code', 'role', 'school_id', 'created_by', 'is_used', 'used_by', 'used_at', 'expires_at', 'created_at'],
  staff_invitations: ['id', 'email', 'school_id', 'role', 'department_id', 'invited_by', 'token', 'status', 'accepted_at', 'expires_at', 'created_at'],
  user_sessions: ['id', 'user_id', 'session_token', 'ip_address', 'user_agent', 'expires_at', 'created_at', 'updated_at'],
  school_departments: ['id', 'school_id', 'name', 'created_at', 'updated_at'],
  permission_groups: ['id', 'school_id', 'name', 'description', 'created_at', 'updated_at'],
  permission_group_roles: ['id', 'permission_group_id', 'role', 'created_at'],
  permission_features: ['id', 'name', 'description', 'category', 'created_at'],
  school_settings: ['id', 'school_id', 'setting_key', 'setting_value', 'created_at', 'updated_at'],
};

async function main() {
  console.log('=== SUPABASE LIVE SCHEMA VERIFICATION ===\n');

  // 1. Test connection
  const { data: test, error: connErr } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  if (connErr) {
    console.log('✗ CONNECTION FAILED:', connErr.message);
    process.exit(1);
  }
  console.log('✓ Connection OK\n');

  // 2. List all public tables using SQL
  console.log('=== ALL PUBLIC TABLES ===');
  const { data: allTables, error: tblErr } = await supabase
    .rpc('sql', { query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;` })
    .maybeSingle();

  // Fallback: try direct SQL
  let liveTables = [];
  try {
    const { data: rawTables, error: rawErr } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    if (!rawErr && rawTables) {
      liveTables = rawTables.map(r => r.table_name);
    }
  } catch (e) {
    // ignore
  }

  // Fallback 2: just try querying each expected table
  if (liveTables.length === 0) {
    console.log('(Using per-table existence check)\n');
    for (const tableName of EXPECTED_TABLES) {
      try {
        const { error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
        if (!error) {
          liveTables.push(tableName);
        }
      } catch (e) {
        // skip
      }
    }
  }

  console.log(`Found ${liveTables.length} tables:\n`);
  liveTables.forEach(t => console.log(`  ${t}`));

  // 3. Check which expected tables exist / are missing
  console.log('\n=== EXPECTED TABLE STATUS ===');
  const missing = [];
  const present = [];
  for (const tableName of [...EXPECTED_TABLES].sort()) {
    const exists = liveTables.includes(tableName);
    if (exists) {
      present.push(tableName);
      console.log(`  ✓ ${tableName}`);
    } else {
      missing.push(tableName);
      console.log(`  ✗ ${tableName} — MISSING`);
    }
  }

  // 4. Check for extra tables not in expected list
  const extraTables = liveTables.filter(t => !EXPECTED_TABLES.includes(t));
  if (extraTables.length > 0) {
    console.log('\n=== EXTRA TABLES (not in expected list) ===');
    extraTables.forEach(t => console.log(`  ? ${t}`));
  }

  // 5. Column-level check for present tables
  console.log('\n=== COLUMN-LEVEL VERIFICATION ===');
  let columnIssues = [];
  for (const tableName of present.slice(0, 10)) {
    const expectedCols = EXPECTED_COLUMNS[tableName];
    if (!expectedCols) continue;

    try {
      const { data: cols, error: colErr } = await supabase
        .rpc('sql', { query: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' ORDER BY ordinal_position;` })
        .maybeSingle();
      
      if (!colErr && cols) {
        const liveCols = Array.isArray(cols) ? cols.map(c => c.column_name) : [];
        const missingCols = expectedCols.filter(c => !liveCols.includes(c));
        const extraCols = liveCols.filter(c => !expectedCols.includes(c));
        
        if (missingCols.length > 0 || extraCols.length > 0) {
          console.log(`  ${tableName}:`);
          if (missingCols.length > 0) console.log(`    Missing: ${missingCols.join(', ')}`);
          if (extraCols.length > 0) console.log(`    Extra: ${extraCols.join(', ')}`);
          columnIssues.push({ table: tableName, missing: missingCols, extra: extraCols });
        } else {
          console.log(`  ✓ ${tableName} — columns match`);
        }
      }
    } catch (e) {
      console.log(`  ? ${tableName} — could not inspect columns: ${e.message}`);
    }
  }

  // 6. Check schema.sql-based RLS and functions
  console.log('\n=== RLS STATUS ===');
  const rlsTables = ['schools', 'profiles', 'grades', 'classes', 'subjects', 'lessons', 'attendance', 'announcements', 'results', 'audit_logs', 'parents', 'parent_students', 'academic_years', 'terms', 'grading_scales', 'notifications', 'events', 'messages', 'payments', 'finance_records', 'email_verifications'];
  
  for (const t of rlsTables.slice(0, 5)) {
    try {
      const { data: rls, error: rlsErr } = await supabase
        .rpc('sql', { query: `SELECT relrowsecurity FROM pg_class WHERE relname = '${t}' AND relnamespace = 'public'::regnamespace;` })
        .maybeSingle();
      if (!rlsErr && rls) {
        console.log(`  ${t}: RLS = ${rls.relrowsecurity}`);
      }
    } catch (e) {
      // skip
    }
  }

  // 7. Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total expected tables: ${EXPECTED_TABLES.length}`);
  console.log(`Tables present: ${present.length}`);
  console.log(`Tables missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Missing tables: ${missing.join(', ')}`);
  }
  if (extraTables.length > 0) {
    console.log(`Extra tables: ${extraTables.join(', ')}`);
  }
  if (columnIssues.length > 0) {
    console.log(`Tables with column mismatches: ${columnIssues.length}`);
  }
  console.log(`\nSchema verification ${missing.length === 0 ? 'PASSED' : 'FAILED — missing tables found'}`);

  // Save results to file
  const result = {
    timestamp: new Date().toISOString(),
    present,
    missing,
    extraTables,
    columnIssues,
    status: missing.length === 0 ? 'PASSED' : 'FAILED'
  };
  fs.writeFileSync('schema-verification-result.json', JSON.stringify(result, null, 2));
  console.log('\nResults saved to schema-verification-result.json');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });