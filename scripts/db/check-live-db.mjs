import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnnroitaftfmclegbeac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubnJvaXRhZnRmbWNsZWdiZWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU4MTAxMiwiZXhwIjoyMDg4MTU3MDEyfQ.Q1L4vCsm0SUeMO6b75Vp3NAlA2CaUZ_AsbJ1esB4UaA'
);

const KEY_TABLES = [
  'access_codes', 'staff_invitations', 'user_sessions',
  'school_departments', 'permission_groups', 'permission_group_roles',
  'permission_features', 'school_settings', 'profiles'
];

async function main() {
  try {
    // Try simple query to test connection
    const { data: test, error: connErr } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (connErr) {
      console.log('CONNECTION ERROR:', connErr.message);
      process.exit(1);
    }
    console.log('SUPABASE CONNECTION: OK');

    // List all public tables using RPC
    const { data: tables, error: tblErr } = await supabase.rpc('list_public_tables').maybeSingle();
    
    // Try direct query
    const { data: raw, error: rawErr } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .order('tablename');

    if (!rawErr && raw) {
      console.log('\n=== PUBLIC TABLES (' + raw.length + ') ===');
      raw.forEach(r => {
        const marker = KEY_TABLES.includes(r.tablename) ? ' ★' : '';
        console.log('  ' + r.tablename + marker);
      });
    }

    // Check which key tables exist
    console.log('\n=== KEY TABLES STATUS ===');
    for (const name of KEY_TABLES) {
      const { error } = await supabase.from(name).select('count', { count: 'exact', head: true });
      console.log(error ? `  ✗ ${name} — NOT FOUND` : `  ✓ ${name} — EXISTS`);
    }

    // Check profiles role constraint
    console.log('\n=== PROFILES TABLE ROLE CHECK ===');
    const { data: roles, error: roleErr } = await supabase
      .from('profiles')
      .select('role')
      .limit(5);
    if (!roleErr) {
      console.log('  Sample roles:', roles.map(r => r.role));
    }

    // Check constraints
    const { data: checks, error: chkErr } = await supabase
      .from('pg_constraint')
      .select('conname, consrc')
      .eq('contype', 'c')
      .like('conname', '%role%');
    if (!chkErr && checks) {
      console.log('\n  Role constraints found:', checks.length);
      checks.forEach(c => console.log('    ' + c.conname + ': ' + c.consrc?.substring(0, 120)));
    }

  } catch (e) {
    console.error('FATAL:', e.message);
  }
}

main().then(() => process.exit(0));