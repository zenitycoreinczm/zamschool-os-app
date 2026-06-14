-- ============================================================================
-- SECURITY HARDENING: Row-Level Security policies
-- Applies least-privilege policies for browser-accessible Supabase tables.
-- ============================================================================

DROP FUNCTION IF EXISTS public.exec_sql(TEXT);

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid()
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
  WHERE id = auth.uid()
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

CREATE OR REPLACE FUNCTION public.is_payments_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() = 'payments';
$$;

-- RLS policies execute these helpers as authenticated PostgREST users.
GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payments_role() TO authenticated;

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
        'email_verifications'
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

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'grades',
        'classes',
        'subjects',
        'lessons',
        'academic_years',
        'terms',
        'grading_scales'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', table_name || '_isolation_policy', table_name);
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

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'events',
        'announcements',
        'assignments',
        'finance_records',
        'audit_logs',
        'results',
        'attendance',
        'parents',
        'parent_students'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', table_name || '_isolation_policy', table_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', table_name || '_admin_manage', table_name);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (school_id = public.get_my_school_id() AND public.is_admin_role()) WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());',
                table_name || '_admin_manage',
                table_name
            );
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'schools'
    ) THEN
        DROP POLICY IF EXISTS school_isolation_policy ON public.schools;
        DROP POLICY IF EXISTS schools_same_school_read ON public.schools;
        DROP POLICY IF EXISTS schools_admin_update ON public.schools;

        CREATE POLICY schools_same_school_read ON public.schools
            FOR SELECT TO authenticated
            USING (id = public.get_my_school_id());

        CREATE POLICY schools_admin_update ON public.schools
            FOR UPDATE TO authenticated
            USING (id = public.get_my_school_id() AND public.is_admin_role())
            WITH CHECK (id = public.get_my_school_id() AND public.is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        DROP POLICY IF EXISTS profile_isolation_policy ON public.profiles;
        DROP POLICY IF EXISTS profiles_isolation_policy ON public.profiles;
        DROP POLICY IF EXISTS admin_manage_all ON public.profiles;
        DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
        DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
        DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
        DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;

        CREATE POLICY profiles_select_own_or_admin ON public.profiles
            FOR SELECT TO authenticated
            USING (
                id = auth.uid()
                OR (school_id = public.get_my_school_id() AND public.is_admin_role())
            );

        CREATE POLICY profiles_admin_insert ON public.profiles
            FOR INSERT TO authenticated
            WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

        CREATE POLICY profiles_admin_update ON public.profiles
            FOR UPDATE TO authenticated
            USING (school_id = public.get_my_school_id() AND public.is_admin_role())
            WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

        CREATE POLICY profiles_admin_delete ON public.profiles
            FOR DELETE TO authenticated
            USING (school_id = public.get_my_school_id() AND public.is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        DROP POLICY IF EXISTS notifications_isolation_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_own_read ON public.notifications;
        DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
        DROP POLICY IF EXISTS notifications_admin_manage ON public.notifications;

        CREATE POLICY notifications_own_read ON public.notifications
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());

        CREATE POLICY notifications_own_update ON public.notifications
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());

        CREATE POLICY notifications_admin_manage ON public.notifications
            FOR ALL TO authenticated
            USING (school_id = public.get_my_school_id() AND public.is_admin_role())
            WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'messages'
    ) THEN
        DROP POLICY IF EXISTS messages_isolation_policy ON public.messages;
        DROP POLICY IF EXISTS messages_own_read ON public.messages;
        DROP POLICY IF EXISTS messages_own_insert ON public.messages;
        DROP POLICY IF EXISTS messages_own_update ON public.messages;
        DROP POLICY IF EXISTS messages_admin_manage ON public.messages;

        CREATE POLICY messages_own_read ON public.messages
            FOR SELECT TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND (sender_id = auth.uid() OR recipient_id = auth.uid())
            );

        CREATE POLICY messages_own_insert ON public.messages
            FOR INSERT TO authenticated
            WITH CHECK (
                school_id = public.get_my_school_id()
                AND sender_id = auth.uid()
            );

        CREATE POLICY messages_own_update ON public.messages
            FOR UPDATE TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND recipient_id = auth.uid()
            )
            WITH CHECK (
                school_id = public.get_my_school_id()
                AND recipient_id = auth.uid()
            );

        CREATE POLICY messages_admin_manage ON public.messages
            FOR ALL TO authenticated
            USING (school_id = public.get_my_school_id() AND public.is_admin_role())
            WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'payments'
    ) THEN
        DROP POLICY IF EXISTS payments_isolation_policy ON public.payments;
        DROP POLICY IF EXISTS payments_read_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_insert_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_update_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_delete_admin ON public.payments;

        CREATE POLICY payments_read_admin_or_payments ON public.payments
            FOR SELECT TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND (public.is_admin_role() OR public.is_payments_role())
            );

        CREATE POLICY payments_insert_admin_or_payments ON public.payments
            FOR INSERT TO authenticated
            WITH CHECK (
                school_id = public.get_my_school_id()
                AND (public.is_admin_role() OR public.is_payments_role())
            );

        CREATE POLICY payments_update_admin_or_payments ON public.payments
            FOR UPDATE TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND (public.is_admin_role() OR public.is_payments_role())
            )
            WITH CHECK (
                school_id = public.get_my_school_id()
                AND (public.is_admin_role() OR public.is_payments_role())
            );

        CREATE POLICY payments_delete_admin ON public.payments
            FOR DELETE TO authenticated
            USING (
                school_id = public.get_my_school_id()
                AND public.is_admin_role()
            );
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'email_verifications'
    ) THEN
        DROP POLICY IF EXISTS email_verification_own ON public.email_verifications;
        DROP POLICY IF EXISTS email_verifications_own_read ON public.email_verifications;
        DROP POLICY IF EXISTS email_verifications_own_update ON public.email_verifications;

        CREATE POLICY email_verifications_own_read ON public.email_verifications
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());

        CREATE POLICY email_verifications_own_update ON public.email_verifications
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
