-- Migration 025: Restore tenant RLS on profiles and schools (audit task #1).
-- Aligns get_my_school_id() with get_my_role() / auth.uid() via auth_user_id.
-- Policies based on 010_harden_rls_policies.sql; is_admin_role() from 024.

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS uuid
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

GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- schools
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

-- profiles
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
    OR auth_user_id = auth.uid()
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
