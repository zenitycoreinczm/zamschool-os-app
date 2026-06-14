-- Migration: Expand admin roles and replace 'admin' with 'principal'
-- File: migrations/022_expanded_roles.sql

-- 1. Drop the existing role constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- 2. Update existing 'admin' roles to 'principal' in the database (profiles table)
UPDATE profiles 
SET role = 'principal' 
WHERE role::text = 'admin' OR role::text = 'ADMIN';

-- 3. Add the new check constraint with expanded roles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role::text IN (
    'super_admin',
    'principal', 
    'bursar', 
    'academic_admin', 
    'hr_admin', 
    'ict_admin', 
    'discipline_admin', 
    'teacher', 
    'student', 
    'parent', 
    'payments',
    'admin' -- Kept for backward compatibility if needed
));

-- 4. Update the is_admin_role helper to include principal and super_admin
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN AS $$
    SELECT get_my_role() IN ('admin', 'principal', 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 5. Grant execute on the updated function
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
