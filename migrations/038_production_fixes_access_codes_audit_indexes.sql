-- ============================================================================
-- ZamSchool OS - Production Fix: Access Codes + Audit Logs + Indexes
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================
-- This migration fixes three reported issues:
--   1. SUPER_ADMIN can't create access codes (missing columns / missing audit_logs table)
--   2. Slow results/teacher pages (missing database indexes)
--   3. Audit log table missing (blocks nothing but produces console warnings)
-- ============================================================================

-- ============================================================================
-- PART 1: Ensure access_codes table has ALL necessary columns
-- ============================================================================

-- Add missing columns to access_codes (if not already present)
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS school_type text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS ownership_type text;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS notes text;

-- Add usage constraint (only if not already present)
ALTER TABLE public.access_codes
  DROP CONSTRAINT IF EXISTS access_codes_usage_check,
  ADD CONSTRAINT access_codes_usage_check CHECK (max_uses > 0 AND use_count >= 0 AND use_count <= max_uses);

-- Add approval status constraint (only if not already present)
ALTER TABLE public.access_codes
  DROP CONSTRAINT IF EXISTS access_codes_approval_status_check,
  ADD CONSTRAINT access_codes_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired'));

-- Performance index for access codes queries
CREATE INDEX IF NOT EXISTS idx_access_codes_approval_usage
  ON public.access_codes (approval_status, expires_at, use_count);

-- Grant permissions
GRANT ALL ON public.access_codes TO authenticated;

-- ============================================================================
-- PART 2: Create audit_logs table if missing (used by all admin API routes)
-- ============================================================================

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

-- Add columns that may have been added in later migrations
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Indexes for audit_logs performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created
  ON public.audit_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action
  ON public.audit_logs(user_id, created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        school_id = get_my_school_id()
        AND LOWER(get_my_role()::text) IN ('admin', 'principal', 'super_admin')
    );

DROP POLICY IF EXISTS audit_logs_service_insert ON public.audit_logs;
CREATE POLICY audit_logs_service_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 3: Performance indexes for teacher workspace & results pages
-- ============================================================================

-- Speed up teacher bootstrap / dashboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_school_role
  ON public.profiles(school_id, role);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_class_school
  ON public.assignments(school_id, teacher_id, class_id);

CREATE INDEX IF NOT EXISTS idx_results_assignment_school
  ON public.results(school_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_results_student
  ON public.results(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON public.attendance(student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON public.attendance(class_id, date);

CREATE INDEX IF NOT EXISTS idx_lessons_teacher_day
  ON public.lessons(school_id, teacher_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_lessons_class_day
  ON public.lessons(school_id, class_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_school
  ON public.messages(school_id, recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_school
  ON public.notifications(school_id, user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_events_school_date
  ON public.events(school_id, event_date);

-- ============================================================================
-- PART 4: Fix profiles for super_admin role support
-- ============================================================================

-- Ensure super_admin is in the role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'payments', 'super_admin',
                  'PRINCIPAL', 'DEPUTY_HEAD', 'BURSAR', 'ACADEMIC_ADMIN', 'HR_ADMIN',
                  'ICT_ADMIN', 'DISCIPLINE_ADMIN', 'GUIDANCE_OFFICE'));

-- ============================================================================
-- PART 5: Grant schema permissions (fixes "permission denied for schema public")
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
