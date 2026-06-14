-- ============================================================================
-- SECURITY HARDENING: Remove legacy permissive RLS policies that weaken the
-- allowlisted policy set introduced by 010_harden_rls_policies.sql.
-- PostgreSQL ORs permissive policies together, so stale policies remain active
-- unless explicitly dropped.
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
    allowed_policies JSONB := jsonb_build_object(
        'schools', jsonb_build_array(
            'schools_same_school_read',
            'schools_admin_update'
        ),
        'profiles', jsonb_build_array(
            'profiles_select_own_or_admin',
            'profiles_admin_insert',
            'profiles_admin_update',
            'profiles_admin_delete'
        ),
        'grades', jsonb_build_array(
            'grades_same_school_read',
            'grades_admin_manage'
        ),
        'classes', jsonb_build_array(
            'classes_same_school_read',
            'classes_admin_manage'
        ),
        'subjects', jsonb_build_array(
            'subjects_same_school_read',
            'subjects_admin_manage'
        ),
        'lessons', jsonb_build_array(
            'lessons_same_school_read',
            'lessons_admin_manage'
        ),
        'attendance', jsonb_build_array(
            'attendance_admin_manage'
        ),
        'announcements', jsonb_build_array(
            'announcements_admin_manage'
        ),
        'results', jsonb_build_array(
            'results_admin_manage'
        ),
        'audit_logs', jsonb_build_array(
            'audit_logs_admin_read',
            'audit_logs_service_insert'
        ),
        'parents', jsonb_build_array(
            'parents_admin_manage'
        ),
        'parent_students', jsonb_build_array(
            'parent_students_admin_manage'
        ),
        'academic_years', jsonb_build_array(
            'academic_years_same_school_read',
            'academic_years_admin_manage'
        ),
        'terms', jsonb_build_array(
            'terms_same_school_read',
            'terms_admin_manage'
        ),
        'grading_scales', jsonb_build_array(
            'grading_scales_same_school_read',
            'grading_scales_admin_manage'
        ),
        'notifications', jsonb_build_array(
            'notifications_own_read',
            'notifications_own_update',
            'notifications_admin_manage'
        ),
        'events', jsonb_build_array(
            'events_admin_manage'
        ),
        'messages', jsonb_build_array(
            'messages_own_read',
            'messages_own_insert',
            'messages_own_update',
            'messages_admin_manage'
        ),
        'payments', jsonb_build_array(
            'payments_read_admin_or_payments',
            'payments_insert_admin_or_payments',
            'payments_update_admin_or_payments',
            'payments_delete_admin'
        ),
        'finance_records', jsonb_build_array(
            'finance_records_admin_manage'
        ),
        'assignments', jsonb_build_array(
            'assignments_admin_manage'
        ),
        'email_verifications', jsonb_build_array(
            'email_verifications_own_read',
            'email_verifications_own_update'
        )
    );
BEGIN
    FOR policy_record IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'schools',
              'profiles',
              'grades',
              'classes',
              'subjects',
              'lessons',
              'attendance',
              'announcements',
              'results',
              'audit_logs',
              'parents',
              'parent_students',
              'academic_years',
              'terms',
              'grading_scales',
              'notifications',
              'events',
              'messages',
              'payments',
              'finance_records',
              'assignments',
              'email_verifications'
          )
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(allowed_policies -> policy_record.tablename) AS allowed_name(name)
            WHERE allowed_name.name = policy_record.policyname
        ) THEN
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.%I;',
                policy_record.policyname,
                policy_record.tablename
            );
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'audit_logs'
    ) THEN
        DROP POLICY IF EXISTS "Admin can view school audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "No deletes from audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "No updates to audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_admin_manage ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
        DROP POLICY IF EXISTS audit_logs_service_insert ON public.audit_logs;

        CREATE POLICY audit_logs_admin_read ON public.audit_logs
            FOR SELECT TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND public.is_admin_role()
            );

        CREATE POLICY audit_logs_service_insert ON public.audit_logs
            FOR INSERT TO service_role
            WITH CHECK (true);
    END IF;
END $$;
