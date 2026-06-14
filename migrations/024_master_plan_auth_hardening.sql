-- Migration 024: Master-plan authentication and tenant hardening.
-- Keeps existing parent/student flows while tightening school creation,
-- delegated staff roles, access codes, and permission metadata.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN max_uses integer NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'use_count'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN use_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'province'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN province text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'district'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN district text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'school_type'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN school_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'ownership_type'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN ownership_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.access_codes ADD COLUMN notes text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL,
  department text,
  position text,
  first_name text,
  last_name text,
  phone text,
  token text NOT NULL UNIQUE,
  temporary_password text,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (school_id, email)
);

CREATE TABLE IF NOT EXISTS public.permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS public.permission_group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (group_id, role)
);

CREATE TABLE IF NOT EXISTS public.permission_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT true,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  scope text DEFAULT 'school',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (group_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.school_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  head_of_department uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (school_id, setting_key)
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  auth_session_id text,
  device_name text,
  device_type text,
  browser text,
  os text,
  ip_address text,
  location text,
  is_active boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  terminated_at timestamp with time zone
);

DO $$
BEGIN
  IF to_regclass('public.staff_invitations') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'department') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN department text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'position') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN position text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'phone') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'accepted_at') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN accepted_at timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'accepted_by') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'revoked_at') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN revoked_at timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'temporary_password') THEN
      ALTER TABLE public.staff_invitations ADD COLUMN temporary_password text;
    END IF;
  END IF;
END $$;

-- RLS policies for these tables: see 025_master_plan_auth_rls_policies.sql
-- (staff_invitations policies may be applied separately on live DB)
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.access_codes
  DROP CONSTRAINT IF EXISTS access_codes_usage_check,
  ADD CONSTRAINT access_codes_usage_check CHECK (max_uses > 0 AND use_count >= 0 AND use_count <= max_uses);

ALTER TABLE public.access_codes
  DROP CONSTRAINT IF EXISTS access_codes_approval_status_check,
  ADD CONSTRAINT access_codes_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_invitations' AND column_name = 'role'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.staff_invitations
      ALTER COLUMN role TYPE text USING lower(role::text);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'permission_group_roles' AND column_name = 'role'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.permission_group_roles
      ALTER COLUMN role TYPE text USING lower(role::text);
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (lower(role::text) IN (
    'admin',
    'super_admin',
    'principal',
    'head_teacher',
    'deputy_head',
    'deputy_head_teacher',
    'bursar',
    'payments',
    'guidance_office',
    'guidance_officer',
    'academic_admin',
    'hr_admin',
    'ict_admin',
    'it_admin',
    'discipline_admin',
    'teacher',
    'student',
    'parent'
  ));

DO $$
BEGIN
  IF to_regclass('public.staff_invitations') IS NOT NULL THEN
    ALTER TABLE public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_role_check;
    ALTER TABLE public.staff_invitations
      ADD CONSTRAINT staff_invitations_role_check
      CHECK (lower(role::text) IN (
        'teacher',
        'payments',
        'bursar',
        'deputy_head',
        'guidance_office',
        'academic_admin',
        'hr_admin',
        'ict_admin',
        'discipline_admin'
      ));
  END IF;

  IF to_regclass('public.permission_group_roles') IS NOT NULL THEN
    ALTER TABLE public.permission_group_roles DROP CONSTRAINT IF EXISTS permission_group_roles_role_check;
    ALTER TABLE public.permission_group_roles
      ADD CONSTRAINT permission_group_roles_role_check
      CHECK (lower(role::text) IN (
        'admin',
        'principal',
        'deputy_head',
        'bursar',
        'payments',
        'guidance_office',
        'academic_admin',
        'hr_admin',
        'ict_admin',
        'discipline_admin',
        'teacher'
      ));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT lower(role::text)
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() IN (
    'admin',
    'principal',
    'head_teacher',
    'super_admin',
    'deputy_head',
    'deputy_head_teacher',
    'academic_admin',
    'hr_admin',
    'ict_admin',
    'it_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_payments_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() IN ('payments', 'bursar');
$$;

CREATE OR REPLACE FUNCTION public.is_sensitive_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() IN (
    'super_admin',
    'principal',
    'head_teacher',
    'bursar',
    'ict_admin',
    'it_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payments_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sensitive_role() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_access_codes_approval_usage
  ON public.access_codes (approval_status, expires_at, use_count);

DO $$
BEGIN
  IF to_regclass('public.staff_invitations') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_staff_invitations_school_role
      ON public.staff_invitations (school_id, lower(role));
  END IF;

  IF to_regclass('public.permission_group_roles') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_permission_group_roles_school_role
      ON public.permission_group_roles (school_id, lower(role));
  END IF;
END $$;
