-- ============================================================================
-- MIGRATION 040: Add 'admin' to staff_invitations role check constraint
-- Fixes: POST /api/staff/invitations 500 error when inviting admin role
-- The Zod schema allowed "admin" but the DB constraint did not.
-- ============================================================================

ALTER TABLE public.staff_invitations
  DROP CONSTRAINT IF EXISTS staff_invitations_role_check;

ALTER TABLE public.staff_invitations
  ADD CONSTRAINT staff_invitations_role_check
  CHECK (
    lower(role) = ANY (ARRAY[
      'admin'::text,
      'teacher'::text,
      'payments'::text,
      'bursar'::text,
      'deputy_head'::text,
      'guidance_office'::text,
      'academic_admin'::text,
      'hr_admin'::text,
      'ict_admin'::text,
      'discipline_admin'::text
    ])
  );
