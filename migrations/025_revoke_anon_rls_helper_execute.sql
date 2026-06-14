-- ============================================================================
-- MIGRATION 025: Revoke anon execute on RLS helper SECURITY DEFINER functions
-- These helpers are used inside RLS policies for authenticated users only.
-- Default PostgreSQL grants (PUBLIC) exposed them via PostgREST to anon.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.get_my_school_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_payments_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_sensitive_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_invitations() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_function() FROM anon, PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payments_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sensitive_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_invitations() TO authenticated;
