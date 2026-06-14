-- ============================================================================
-- MIGRATION 018: Security Alignment & Hardening
-- Standardizes multi-tenant isolation and secures previously unprotected tables.
-- ============================================================================

-- 1. Standardize Helper Functions
-- Robustly link auth users to profiles using both ID (direct) and auth_user_id (legacy link).
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT LOWER(CAST(role AS TEXT))
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() = 'admin';
$$;

-- Grant permissions to authenticated users for these helpers
GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;

-- 2. Enable RLS on Missing Tables
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'teacher_subject_specializations',
        'teacher_class_subject_assignments',
        'assignment_submissions',
        'sync_queue'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
        END IF;
    END LOOP;
END $$;

-- 3. Implement School-Based Isolation Policies

-- Teacher Specializations & Assignments
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'teacher_subject_specializations',
        'teacher_class_subject_assignments'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', table_name || '_same_school_read', table_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', table_name || '_admin_manage', table_name);

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_my_school_id());',
                table_name || '_same_school_read',
                table_name
            );
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_my_school_id() AND public.is_admin_role()) WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());',
                table_name || '_admin_manage',
                table_name
            );
        END IF;
    END LOOP;
END $$;

-- Assignment Submissions
-- Students can see/edit their own, Teachers/Admins can see all in school
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_submissions') THEN
        DROP POLICY IF EXISTS submissions_select_policy ON public.assignment_submissions;
        DROP POLICY IF EXISTS submissions_student_upsert ON public.assignment_submissions;

        CREATE POLICY submissions_select_policy ON public.assignment_submissions
            FOR SELECT TO authenticated
            USING (
                school_id = public.get_my_school_id() 
                AND (
                    student_profile_id = auth.uid() 
                    OR public.get_my_role() IN ('teacher', 'admin')
                )
            );

        CREATE POLICY submissions_student_upsert ON public.assignment_submissions
            FOR ALL TO authenticated
            USING (
                school_id = public.get_my_school_id() 
                AND student_profile_id = auth.uid()
            )
            WITH CHECK (
                school_id = public.get_my_school_id() 
                AND student_profile_id = auth.uid()
            );
    END IF;
END $$;

-- Sync Queue: Strictly internal. No authenticated or anon access.
-- We ensure no policies exist, effectively blocking all PostgREST access since RLS is enabled.
DROP POLICY IF EXISTS sync_queue_isolation ON public.sync_queue;

-- 4. Correct Sync Triggers
-- The 009_sync_triggers.sql migration erroneously referenced 'timetable' instead of 'lessons'.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lessons') THEN
        DROP TRIGGER IF EXISTS sync_lessons ON public.lessons;
        CREATE TRIGGER sync_lessons
            AFTER INSERT OR UPDATE OR DELETE ON public.lessons
            FOR EACH ROW
            EXECUTE FUNCTION public.notify_change();
            
        -- Cleanup legacy erroneous trigger if it exists
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_timetable') THEN
            DROP TRIGGER IF EXISTS sync_timetable ON public.lessons;
        END IF;
    END IF;
END $$;

-- 5. Harden Audit Logs access
-- Ensure only Admins can see school-wide audit logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        DROP POLICY IF EXISTS audit_logs_admin_manage ON public.audit_logs;
        CREATE POLICY audit_logs_admin_manage ON public.audit_logs
            FOR SELECT TO authenticated
            USING (school_id = public.get_my_school_id() AND public.is_admin_role());
    END IF;
END $$;
