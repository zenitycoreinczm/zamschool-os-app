-- ============================================================================
-- ZAMSCHOOL OS - DATABASE MIGRATION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to existing tables
-- ============================================================================

-- Add first_name and last_name to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='must_change_password') THEN
        ALTER TABLE profiles ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='temporary_password_issued_at') THEN
        ALTER TABLE profiles ADD COLUMN temporary_password_issued_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Populate first_name and last_name from existing name field (if name column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='name') THEN
        UPDATE profiles
        SET 
            first_name = SPLIT_PART(name, ' ', 1),
            last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        WHERE name IS NOT NULL 
          AND name != '' 
          AND first_name IS NULL 
          AND POSITION(' ' IN name) > 0;

        UPDATE profiles
        SET first_name = name
        WHERE name IS NOT NULL 
          AND name != '' 
          AND first_name IS NULL;
    END IF;
END $$;

-- Add school_id to existing tables if missing (required for RLS policies)
DO $$ 
BEGIN
    -- Add school_id to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='school_id') THEN
        ALTER TABLE profiles ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
    
    -- Add school_id to classes if missing (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='classes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='school_id') THEN
            ALTER TABLE classes ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- Add school_id to subjects if missing (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='subjects') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='school_id') THEN
            ALTER TABLE subjects ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- Add school_id to grades if missing (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='grades') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='school_id') THEN
            ALTER TABLE grades ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='parent_students' AND table_schema='public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parent_students' AND column_name='school_id') THEN
            ALTER TABLE parent_students ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='messages' AND table_schema='public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='recipient_id')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='receiver_id') THEN
            ALTER TABLE messages RENAME COLUMN receiver_id TO recipient_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='body')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='content') THEN
            ALTER TABLE messages RENAME COLUMN content TO body;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='subject') THEN
            ALTER TABLE messages ADD COLUMN subject TEXT;
        END IF;
    END IF;
END $$;

-- Create helper function for RLS school isolation (used in policies)
-- Uses dynamic SQL to avoid validation errors if school_id doesn't exist yet
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
DECLARE
    result UUID;
    col_exists BOOLEAN;
BEGIN
    -- Check if school_id column exists on profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'school_id'
    ) INTO col_exists;
    
    IF col_exists THEN
        SELECT school_id INTO result FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
    ELSE
        result := NULL;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create missing tables
-- ============================================================================

-- Parents Table (extended parent information)
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    relation_type TEXT,
    occupation TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Student Links
CREATE TABLE IF NOT EXISTS parent_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, student_id)
);

-- Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Terms
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grading Scales
CREATE TABLE IF NOT EXISTS grading_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    grade TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    target_role TEXT,
    target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments/Fees
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_type TEXT,
    payment_method TEXT,
    reference_number TEXT,
    status TEXT DEFAULT 'PENDING',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Finance Records
CREATE TABLE IF NOT EXISTS finance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    category TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    description TEXT,
    payment_method TEXT,
    reference_number TEXT,
    transaction_date DATE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments (homework and class assignments)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    total_marks NUMERIC DEFAULT 100,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 3: Enable RLS on new tables
-- ============================================================================

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Add hardened RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
    SELECT LOWER(CAST(role AS TEXT))
    FROM profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN AS $$
    SELECT get_my_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION is_payments_role()
RETURNS BOOLEAN AS $$
    SELECT get_my_role() = 'payments';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- RLS policies call these helpers as the logged-in PostgREST role.
-- Without explicit EXECUTE grants, profile reads can fail during login.
GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payments_role() TO authenticated;

-- Allow authenticated PostgREST users to reach public tables.
-- Row access is still constrained by the RLS policies below.
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
        'teacher_subject_specializations',
        'teacher_class_subject_assignments',
        'assignment_submissions'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', table_name);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
        END IF;
    END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

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
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (school_id = get_my_school_id());',
                table_name || '_same_school_read',
                table_name
            );
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (school_id = get_my_school_id() AND is_admin_role()) WITH CHECK (school_id = get_my_school_id() AND is_admin_role());',
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
        'parent_students',
        'teacher_subject_specializations',
        'teacher_class_subject_assignments'
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
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (school_id = get_my_school_id() AND is_admin_role()) WITH CHECK (school_id = get_my_school_id() AND is_admin_role());',
                table_name || '_admin_manage',
                table_name
            );
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
        DROP POLICY IF EXISTS school_isolation_policy ON public.schools;
        DROP POLICY IF EXISTS schools_same_school_read ON public.schools;
        DROP POLICY IF EXISTS schools_admin_update ON public.schools;

        CREATE POLICY schools_same_school_read ON public.schools
            FOR SELECT TO authenticated
            USING (id = get_my_school_id());

        CREATE POLICY schools_admin_update ON public.schools
            FOR UPDATE TO authenticated
            USING (id = get_my_school_id() AND is_admin_role())
            WITH CHECK (id = get_my_school_id() AND is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
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
                OR (school_id = get_my_school_id() AND is_admin_role())
            );

        CREATE POLICY profiles_admin_insert ON public.profiles
            FOR INSERT TO authenticated
            WITH CHECK (school_id = get_my_school_id() AND is_admin_role());

        CREATE POLICY profiles_admin_update ON public.profiles
            FOR UPDATE TO authenticated
            USING (school_id = get_my_school_id() AND is_admin_role())
            WITH CHECK (school_id = get_my_school_id() AND is_admin_role());

        CREATE POLICY profiles_admin_delete ON public.profiles
            FOR DELETE TO authenticated
            USING (school_id = get_my_school_id() AND is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
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
            USING (school_id = get_my_school_id() AND is_admin_role())
            WITH CHECK (school_id = get_my_school_id() AND is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP POLICY IF EXISTS messages_isolation_policy ON public.messages;
        DROP POLICY IF EXISTS messages_own_read ON public.messages;
        DROP POLICY IF EXISTS messages_own_insert ON public.messages;
        DROP POLICY IF EXISTS messages_own_update ON public.messages;
        DROP POLICY IF EXISTS messages_admin_manage ON public.messages;

        CREATE POLICY messages_own_read ON public.messages
            FOR SELECT TO authenticated
            USING (
                school_id = get_my_school_id()
                AND (sender_id = auth.uid() OR recipient_id = auth.uid())
            );

        CREATE POLICY messages_own_insert ON public.messages
            FOR INSERT TO authenticated
            WITH CHECK (
                school_id = get_my_school_id()
                AND sender_id = auth.uid()
            );

        CREATE POLICY messages_own_update ON public.messages
            FOR UPDATE TO authenticated
            USING (
                school_id = get_my_school_id()
                AND recipient_id = auth.uid()
            )
            WITH CHECK (
                school_id = get_my_school_id()
                AND recipient_id = auth.uid()
            );

        CREATE POLICY messages_admin_manage ON public.messages
            FOR ALL TO authenticated
            USING (school_id = get_my_school_id() AND is_admin_role())
            WITH CHECK (school_id = get_my_school_id() AND is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        DROP POLICY IF EXISTS payments_isolation_policy ON public.payments;
        DROP POLICY IF EXISTS payments_read_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_insert_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_update_admin_or_payments ON public.payments;
        DROP POLICY IF EXISTS payments_delete_admin ON public.payments;

        CREATE POLICY payments_read_admin_or_payments ON public.payments
            FOR SELECT TO authenticated
            USING (
                school_id = get_my_school_id()
                AND (is_admin_role() OR is_payments_role())
            );

        CREATE POLICY payments_insert_admin_or_payments ON public.payments
            FOR INSERT TO authenticated
            WITH CHECK (
                school_id = get_my_school_id()
                AND (is_admin_role() OR is_payments_role())
            );

        CREATE POLICY payments_update_admin_or_payments ON public.payments
            FOR UPDATE TO authenticated
            USING (
                school_id = get_my_school_id()
                AND (is_admin_role() OR is_payments_role())
            )
            WITH CHECK (
                school_id = get_my_school_id()
                AND (is_admin_role() OR is_payments_role())
            );

        CREATE POLICY payments_delete_admin ON public.payments
            FOR DELETE TO authenticated
            USING (school_id = get_my_school_id() AND is_admin_role());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_submissions') THEN
        DROP POLICY IF EXISTS submissions_select_policy ON public.assignment_submissions;
        DROP POLICY IF EXISTS submissions_student_upsert ON public.assignment_submissions;

        CREATE POLICY submissions_select_policy ON public.assignment_submissions
            FOR SELECT TO authenticated
            USING (
                school_id = get_my_school_id() 
                AND (
                    student_profile_id = auth.uid() 
                    OR get_my_role() IN ('teacher', 'admin')
                )
            );

        CREATE POLICY submissions_student_upsert ON public.assignment_submissions
            FOR ALL TO authenticated
            USING (
                school_id = get_my_school_id() 
                AND student_profile_id = auth.uid()
            )
            WITH CHECK (
                school_id = get_my_school_id() 
                AND student_profile_id = auth.uid()
            );
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Add indexes for performance
-- ============================================================================

-- Only create indexes if columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='school_id') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_parents_profile_id ON parents(profile_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_academic_year_id ON terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_finance_records_school_id ON finance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);

-- ============================================================================
-- VERIFICATION: Check tables were created
-- ============================================================================

SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN '✅ Created' ELSE '❌ Missing' END as status
FROM (
    VALUES 
        ('parents'),
        ('parent_students'),
        ('academic_years'),
        ('terms'),
        ('grading_scales'),
        ('notifications'),
        ('events'),
        ('messages'),
        ('payments'),
        ('finance_records'),
        ('assignments')
) AS t(table_name);
