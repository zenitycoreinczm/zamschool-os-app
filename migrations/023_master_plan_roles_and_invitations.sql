-- Migration 023: Master Plan - Deputy Head, Guidance Office, Invitations, Permissions, Devices
-- This implements the comprehensive account hierarchy from the master plan

-- ============================================================
-- PART 1: EXPANDED ROLE HIERARCHY
-- ============================================================

-- 1. Drop existing role constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- 2. Update the user_role enum to include new types (safely)
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEPUTY_HEAD';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GUIDANCE_OFFICE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add the expanded role constraint matching the master plan hierarchy:
--    super_admin, principal (Head Teacher), deputy_head, bursar, guidance_office,
--    ict_admin, academic_admin, hr_admin, discipline_admin, teacher, parent, student, payments
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
    'admin'
));

-- 4. Update is_admin_role to include new admin-like roles
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN AS $$
    SELECT get_my_role() IN (
        'admin', 'principal', 'super_admin', 'deputy_head',
        'academic_admin', 'hr_admin', 'ict_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 5. Create is_sensitive_role helper for MFA enforcement
CREATE OR REPLACE FUNCTION is_sensitive_role()
RETURNS BOOLEAN AS $$
    SELECT get_my_role() IN (
        'super_admin', 'principal', 'bursar', 'ict_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.is_sensitive_role() TO authenticated;

-- ============================================================
-- PART 2: RICHER ACCESS CODES
-- ============================================================

-- Add richer metadata to access_codes
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

-- ============================================================
-- PART 3: STAFF INVITATION SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
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

-- ============================================================
-- PART 4: PERMISSION GROUPS & FEATURE ACCESS
-- ============================================================

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
    role user_role NOT NULL,
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
    scope TEXT DEFAULT 'school', -- 'school', 'department', 'own'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, feature_key)
);

ALTER TABLE permission_features ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: DEVICE SESSION TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    auth_session_id TEXT, -- Supabase auth session ID
    device_name TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
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

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_school_id ON user_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);

-- ============================================================
-- PART 6: SCHOOL DEFAULT DEPARTMENTS
-- ============================================================

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

-- ============================================================
-- PART 7: SCHOOL SETTINGS
-- ============================================================

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

-- ============================================================
-- PART 8: RLS POLICIES FOR NEW TABLES
-- ============================================================

-- Staff invitations: school admins can manage, invited user can see own
DROP POLICY IF EXISTS "staff_invitations_school_access" ON staff_invitations;
CREATE POLICY "staff_invitations_school_access" ON staff_invitations
    FOR ALL TO authenticated
    USING (
        school_id = get_my_school_id() AND (
            is_admin_role() OR
            get_my_role() = 'principal' OR
            get_my_role() = 'deputy_head' OR
            get_my_role() = 'hr_admin'
        )
    );

DROP POLICY IF EXISTS "staff_invitations_self_view" ON staff_invitations;
CREATE POLICY "staff_invitations_self_view" ON staff_invitations
    FOR SELECT TO authenticated
    USING (email = auth.email());

-- Permission groups: admins manage, all staff read
DROP POLICY IF EXISTS "permission_groups_school_access" ON permission_groups;
CREATE POLICY "permission_groups_school_access" ON permission_groups
    FOR ALL TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

DROP POLICY IF EXISTS "permission_groups_staff_read" ON permission_groups;
CREATE POLICY "permission_groups_staff_read" ON permission_groups
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id());

-- Permission group roles
DROP POLICY IF EXISTS "permission_group_roles_school_access" ON permission_group_roles;
CREATE POLICY "permission_group_roles_school_access" ON permission_group_roles
    FOR ALL TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

DROP POLICY IF EXISTS "permission_group_roles_staff_read" ON permission_group_roles;
CREATE POLICY "permission_group_roles_staff_read" ON permission_group_roles
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id());

-- Permission features
DROP POLICY IF EXISTS "permission_features_school_access" ON permission_features;
CREATE POLICY "permission_features_school_access" ON permission_features
    FOR ALL TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

DROP POLICY IF EXISTS "permission_features_staff_read" ON permission_features;
CREATE POLICY "permission_features_staff_read" ON permission_features
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id());

-- User sessions: own sessions + admins can view school sessions
DROP POLICY IF EXISTS "user_sessions_self" ON user_sessions;
CREATE POLICY "user_sessions_self" ON user_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_sessions_admin_view" ON user_sessions;
CREATE POLICY "user_sessions_admin_view" ON user_sessions
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

-- School departments
DROP POLICY IF EXISTS "school_departments_school_access" ON school_departments;
CREATE POLICY "school_departments_school_access" ON school_departments
    FOR ALL TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

DROP POLICY IF EXISTS "school_departments_staff_read" ON school_departments;
CREATE POLICY "school_departments_staff_read" ON school_departments
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id());

-- School settings
DROP POLICY IF EXISTS "school_settings_school_access" ON school_settings;
CREATE POLICY "school_settings_school_access" ON school_settings
    FOR ALL TO authenticated
    USING (school_id = get_my_school_id() AND is_admin_role());

DROP POLICY IF EXISTS "school_settings_staff_read" ON school_settings;
CREATE POLICY "school_settings_staff_read" ON school_settings
    FOR SELECT TO authenticated
    USING (school_id = get_my_school_id());

-- ============================================================
-- PART 9: GRANT TABLE PRIVILEGES
-- ============================================================

GRANT ALL ON staff_invitations TO authenticated;
GRANT ALL ON permission_groups TO authenticated;
GRANT ALL ON permission_group_roles TO authenticated;
GRANT ALL ON permission_features TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON school_departments TO authenticated;
GRANT ALL ON school_settings TO authenticated;
GRANT ALL ON access_codes TO authenticated;
