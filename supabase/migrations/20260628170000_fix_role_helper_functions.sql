-- Fix role helper functions and RLS policies that reference invalid role names.
--
-- The profiles.role column stores lowercase values: 'principal', 'deputy_head',
-- 'ict_admin', etc.  Several database functions checked for non-existent values
-- like 'head_teacher' and 'it_admin' — these never matched, making the checks
-- dead code.  This migration corrects all of them.
--
-- Per the new policy, only the Head Teacher (principal) and platform super
-- admin can manage staff invitations — not deputy_head or other admin roles.

-- 1. can_manage_invitations — restrict to principal + super_admin only
CREATE OR REPLACE FUNCTION public.can_manage_invitations()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'auth'
AS $function$
  SELECT public.get_my_role() IN ('principal', 'super_admin');
$function$;

-- 2. is_financial_context_role — remove invalid 'head_teacher' entry
CREATE OR REPLACE FUNCTION public.is_financial_context_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'auth'
AS $function$
  SELECT public.get_my_role() IN (
    'bursar',
    'payments',
    'principal',
    'admin',
    'super_admin'
  );
$function$;

-- 3. is_sensitive_role — remove invalid 'head_teacher' and 'it_admin' entries
CREATE OR REPLACE FUNCTION public.is_sensitive_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public', 'auth'
AS $function$
  SELECT public.get_my_role() IN (
    'super_admin',
    'principal',
    'bursar',
    'ict_admin'
  );
$function$;
