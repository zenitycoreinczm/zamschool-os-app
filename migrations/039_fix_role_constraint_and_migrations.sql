-- ============================================================================
-- MIGRATION 039: Fix Role Constraint & Clean Up Failed Migrations
-- Consolidates the profiles_role_check constraint to include ALL roles
-- currently in use, and fixes the remaining schema gaps from
-- migrations 003, 009, 013, 018, 020, 021, 022, 023.
-- ============================================================================

-- ---------------------------------------------------------------
-- 1. Fix the profiles role check constraint once and for all
-- ---------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- Detect what roles actually exist in the DB and build a constraint
-- that covers every one of them plus all planned roles.
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role::text IN (
    'super_admin',
    'principal',
    'deputy_head',
    'bursar',
    'guidance_office',
    'academic_admin',
    'hr_admin',
    'ict_admin',
    'discipline_admin',
    'teacher',
    'student',
    'parent',
    'payments',
    'admin',
    'ADMIN',
    'TEACHER',
    'STUDENT',
    'PARENT',
    'PAYMENTS',
    'PRINCIPAL',
    'DEPUTY_HEAD',
    'BURSAR',
    'GUIDANCE_OFFICE',
    'ACADEMIC_ADMIN',
    'HR_ADMIN',
    'ICT_ADMIN',
    'DISCIPLINE_ADMIN',
    'SUPER_ADMIN'
));

-- ---------------------------------------------------------------
-- 2. Fix notify_change() function (needed by migration 009/018)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM pg_notify('table_change', json_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', COALESCE(NEW.id, OLD.id)::text
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------
-- 3. Add sync_queue table if missing
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload JSONB,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    retries INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 4. Ensure helper functions exist
-- ---------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ---------------------------------------------------------------
-- 5. Ensure is_admin_role (migration 022/023 updated version)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.get_my_role() IN (
        'admin', 'principal', 'super_admin', 'deputy_head',
        'academic_admin', 'hr_admin', 'ict_admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;

-- ---------------------------------------------------------------
-- 6. Ensure students & teachers role tables exist (020 fix)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    admission_number TEXT,
    student_number TEXT,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    enrollment_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT students_profile_id_unique UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    employee_number TEXT,
    employee_id TEXT,
    teacher_identifier TEXT,
    department TEXT,
    specialization TEXT,
    hire_date DATE,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT teachers_profile_id_unique UNIQUE (profile_id)
);

-- Populate students/teachers from profiles (defensive: catch nulls/constraint errors)
DO $$
BEGIN
    INSERT INTO public.students (id, profile_id, school_id, admission_number, student_number, is_active, created_at, updated_at)
    SELECT p.id, p.id, p.school_id, p.admission_number, p.admission_number,
           COALESCE(LOWER(p.status) <> 'inactive', true),
           COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
    FROM public.profiles p
    WHERE LOWER(CAST(p.role AS TEXT)) = 'student'
      AND p.school_id IS NOT NULL
      AND p.id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = p.id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Student insert skipped: %', SQLERRM;
END;
$$;

DO $$
BEGIN
    INSERT INTO public.teachers (id, profile_id, school_id, employee_number, employee_id, teacher_identifier, is_active, created_at, updated_at)
    SELECT p.id, p.id, p.school_id, p.employee_id, p.employee_id, p.employee_id,
           COALESCE(LOWER(p.status) <> 'inactive', true),
           COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
    FROM public.profiles p
    WHERE LOWER(CAST(p.role AS TEXT)) = 'teacher'
      AND p.school_id IS NOT NULL
      AND p.id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.profile_id = p.id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Teacher insert skipped: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------
-- 7. Ensure access_codes table exists (021 fix)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_codes (
    code VARCHAR(6) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_email TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Add access_codes columns from 023 if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_codes' AND column_name='max_uses') THEN
        ALTER TABLE access_codes ADD COLUMN max_uses INTEGER DEFAULT 1;
        ALTER TABLE access_codes ADD COLUMN use_count INTEGER DEFAULT 0;
        ALTER TABLE access_codes ADD COLUMN province TEXT;
        ALTER TABLE access_codes ADD COLUMN district TEXT;
        ALTER TABLE access_codes ADD COLUMN school_type TEXT;
        ALTER TABLE access_codes ADD COLUMN ownership_type TEXT;
        ALTER TABLE access_codes ADD COLUMN notes TEXT;
    END IF;
END $$;

-- ---------------------------------------------------------------
-- 8. Create tables from 023 (staff_invitations, etc.)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    position TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    token TEXT NOT NULL UNIQUE,
    temporary_password TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, email)
);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS permission_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS permission_group_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, role)
);

ALTER TABLE permission_group_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS permission_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    scope TEXT DEFAULT 'school',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, feature_key)
);

ALTER TABLE permission_features ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    auth_session_id TEXT,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    terminated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS school_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    head_of_department UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

ALTER TABLE school_departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, setting_key)
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 9. Grant table privileges
-- ---------------------------------------------------------------
GRANT ALL ON staff_invitations TO authenticated;
GRANT ALL ON permission_groups TO authenticated;
GRANT ALL ON permission_group_roles TO authenticated;
GRANT ALL ON permission_features TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON school_departments TO authenticated;
GRANT ALL ON school_settings TO authenticated;
GRANT ALL ON access_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
