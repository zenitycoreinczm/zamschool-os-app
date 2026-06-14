-- Allow authenticated PostgREST users to reach public tables.
-- Row access is still constrained by the RLS policies on each table.

GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
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
        'assignment_submissions',
        'fee_structures',
        'student_fees',
        'email_verifications'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', table_name);
        END IF;
    END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
