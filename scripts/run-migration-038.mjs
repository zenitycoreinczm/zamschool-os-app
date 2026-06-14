import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'db.jnnroitaftfmclegbeac.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Isonmumbuna098@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// Check current columns
const { rows: cols } = await client.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'access_codes' ORDER BY ordinal_position"
);
console.log('Current access_codes columns:', cols.map(c => c.column_name).join(', '));

const stmts = [
  // PART 1: access_codes columns
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS province text;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS district text;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS school_type text;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS ownership_type text;",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';",
  "ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS notes text;",
  // Constraints
  "ALTER TABLE public.access_codes DROP CONSTRAINT IF EXISTS access_codes_usage_check;",
  "ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_usage_check CHECK (max_uses > 0 AND use_count >= 0 AND use_count <= max_uses);",
  "ALTER TABLE public.access_codes DROP CONSTRAINT IF EXISTS access_codes_approval_status_check;",
  "ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired'));",
  // Index
  "CREATE INDEX IF NOT EXISTS idx_access_codes_approval_usage ON public.access_codes (approval_status, expires_at, use_count);",
  // Grant
  "GRANT ALL ON public.access_codes TO authenticated;",
  // PART 2: audit_logs table
  `CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,
  "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;",
  "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;",
  "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;",
  // PART 4: profiles constraint
  "ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;",
  "ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'payments', 'super_admin', 'PRINCIPAL', 'DEPUTY_HEAD', 'BURSAR', 'ACADEMIC_ADMIN', 'HR_ADMIN', 'ICT_ADMIN', 'DISCIPLINE_ADMIN', 'GUIDANCE_OFFICE'));",
  // PART 5: grants
  "GRANT USAGE ON SCHEMA public TO authenticated;",
];

for (const stmt of stmts) {
  try {
    await client.query(stmt);
    console.log('OK:', stmt.substring(0, 90));
  } catch (e) {
    console.error('FAIL:', stmt.substring(0, 90), '-', e.message);
  }
}

// Final verification
const { rows: finalCols } = await client.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'access_codes' ORDER BY ordinal_position"
);
console.log('\nFinal access_codes columns:', finalCols.map(c => c.column_name).join(', '));

const { rows: auditCols } = await client.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' ORDER BY ordinal_position"
);
console.log('audit_logs columns:', auditCols.map(c => c.column_name).join(', '));

await client.end();
