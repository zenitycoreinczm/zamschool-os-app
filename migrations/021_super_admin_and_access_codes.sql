-- Migration: Add super_admin role support and secure access codes table
-- File: migrations/021_super_admin_and_access_codes.sql

-- 1. Update profiles role constraint to include super_admin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'payments', 'super_admin'));
END $$;

-- 2. Create access_codes table
CREATE TABLE IF NOT EXISTS access_codes (
    code VARCHAR(6) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_email TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "super_admin_all_access_codes" ON access_codes;
CREATE POLICY "super_admin_all_access_codes" ON access_codes
    FOR ALL TO authenticated
    USING (LOWER(get_my_role()::text) = 'super_admin');
