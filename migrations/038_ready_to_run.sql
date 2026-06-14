-- ============================================================================
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- PART 1: Add missing access_codes columns
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS school_type text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS ownership_type text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS notes text;

-- Constraints
ALTER TABLE public.access_codes DROP CONSTRAINT IF EXISTS access_codes_usage_check;
ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_usage_check CHECK (max_uses > 0 AND use_count >= 0 AND use_count <= max_uses);
ALTER TABLE public.access_codes DROP CONSTRAINT IF EXISTS access_codes_approval_status_check;
ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired'));

-- Index
CREATE INDEX IF NOT EXISTS idx_access_codes_approval_usage ON public.access_codes (approval_status, expires_at, use_count);
GRANT ALL ON public.access_codes TO authenticated;

-- PART 2: audit_logs table (used by createAuditLog)
CREATE TABLE IF NOT EXISTS public.audit_logs (
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
);

-- PART 3: profiles role constraint (roles were already normalized)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','teacher','student','parent','payments','super_admin',
                  'PRINCIPAL','DEPUTY_HEAD','BURSAR','ACADEMIC_ADMIN','HR_ADMIN',
                  'ICT_ADMIN','DISCIPLINE_ADMIN','GUIDANCE_OFFICE'));
