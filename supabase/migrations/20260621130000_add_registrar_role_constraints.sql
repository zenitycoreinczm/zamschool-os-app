-- Add 'registrar' to role CHECK constraints on profiles, staff_invitations,
-- and permission_group_roles. The application layer fully supports the
-- registrar role (roles.ts, staff-invite-options.ts, account-create-policy.ts,
-- account-state.ts, workspace-nav.ts) but the DB constraints were missing it,
-- causing any attempt to invite or create a Registrar to fail with a
-- CHECK violation (PostgreSQL error 23514).

-- 1. profiles_role_check — add 'registrar' and 'REGISTRAR'
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role = ANY (ARRAY[
    'super_admin'::text, 'principal'::text, 'deputy_head'::text, 'bursar'::text,
    'guidance_office'::text, 'academic_admin'::text, 'hr_admin'::text,
    'ict_admin'::text, 'discipline_admin'::text, 'registrar'::text,
    'teacher'::text, 'student'::text, 'parent'::text, 'payments'::text, 'admin'::text,
    'ADMIN'::text, 'TEACHER'::text, 'STUDENT'::text, 'PARENT'::text, 'PAYMENTS'::text,
    'PRINCIPAL'::text, 'DEPUTY_HEAD'::text, 'BURSAR'::text, 'GUIDANCE_OFFICE'::text,
    'ACADEMIC_ADMIN'::text, 'HR_ADMIN'::text, 'ICT_ADMIN'::text,
    'DISCIPLINE_ADMIN'::text, 'REGISTRAR'::text, 'SUPER_ADMIN'::text
  ])
);

-- 2. staff_invitations_role_check — add 'registrar'
ALTER TABLE IF EXISTS public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_role_check;
ALTER TABLE IF EXISTS public.staff_invitations ADD CONSTRAINT staff_invitations_role_check CHECK (
  lower(role) = ANY (ARRAY[
    'admin'::text, 'teacher'::text, 'payments'::text, 'bursar'::text,
    'deputy_head'::text, 'guidance_office'::text, 'academic_admin'::text,
    'hr_admin'::text, 'ict_admin'::text, 'discipline_admin'::text, 'registrar'::text
  ])
);

-- 3. permission_group_roles_role_check — add 'registrar'
ALTER TABLE IF EXISTS public.permission_group_roles DROP CONSTRAINT IF EXISTS permission_group_roles_role_check;
ALTER TABLE IF EXISTS public.permission_group_roles ADD CONSTRAINT permission_group_roles_role_check CHECK (
  lower(role) = ANY (ARRAY[
    'admin'::text, 'principal'::text, 'deputy_head'::text, 'bursar'::text,
    'payments'::text, 'guidance_office'::text, 'academic_admin'::text,
    'hr_admin'::text, 'ict_admin'::text, 'discipline_admin'::text, 'registrar'::text,
    'teacher'::text
  ])
);
