const projectUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!projectUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const projectRef = (() => {
  try {
    return new URL(projectUrl).hostname.split('.')[0] || '_';
  } catch {
    return '_';
  }
})();

console.log('This helper no longer embeds privileged credentials.');
console.log('Run the SQL in the Supabase SQL editor using server-managed credentials:');
console.log(`https://supabase.com/dashboard/project/${projectRef}/sql`);
console.log('SQL file: migrations/run_this_in_supabase_sql_editor.sql');
