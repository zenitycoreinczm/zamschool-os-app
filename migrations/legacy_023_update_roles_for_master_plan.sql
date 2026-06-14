-- Migration: Update roles to match ZamSchool Master Plan
-- File: migrations/023_update_roles_for_master_plan.sql

-- 1. Update existing 'principal' roles to 'head_teacher' (if any)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        UPDATE profiles 
        SET role = 'head_teacher' 
        WHERE role::text = 'principal' OR role::text = 'PRINCIPAL';
    END IF;
END $$;

-- 2. Drop the existing role constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- 3. Add the new check constraint with master plan roles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role::text IN (
    'super_admin',
    'head_teacher',          -- Primary school owner
    'deputy_head_teacher',   -- Delegated authority
    'bursar',                -- Finance officer
    'guidance_officer',      -- Guidance office
    'it_admin',              -- IT administrator (renamed from ict_admin)
    'teacher',
    'student',
    'parent',
    'payments',              -- Payments role (optional)
    'academic_admin',        -- Academic administration
    'hr_admin',              -- HR administration
    'discipline_admin',      -- Discipline administration
    'admin'                  -- Kept for backward compatibility if needed
));

-- 4. Update the is_admin_role helper to include super_admin and head_teacher
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() IN ('super_admin', 'head_teacher');
$$;

-- 5. Grant execute on the updated function
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;

-- 6. Update the ict_admin role to it_admin in existing data (if any)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        UPDATE profiles 
        SET role = 'it_admin' 
        WHERE role::text = 'ict_admin' OR role::text = 'ICT_ADMIN';
    END IF;
END $$;

-- 7. Verify the role constraint was added correctly
SELECT 
    column_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
WHERE cc.constraint_name = 'profiles_role_check';

-- Show current roles in the system
SELECT DISTINCT role, COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;