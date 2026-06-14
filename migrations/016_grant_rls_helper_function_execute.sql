-- Allow logged-in users to execute RLS helper functions used by policies.
-- SECURITY DEFINER controls what the functions can read; EXECUTE controls who can call them.

GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_payments_role() TO authenticated;
