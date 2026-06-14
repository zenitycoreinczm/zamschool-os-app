-- Migration 036: Add auth_user_id to staff_invitations
-- This allows the accept endpoint to find the auth user without listing all users.
-- Also adds a cron-triggerable function to auto-revoke expired invitations.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_invitations' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE staff_invitations ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_invitations_auth_user_id ON staff_invitations(auth_user_id);

-- Function to auto-revoke expired pending invitations.
-- Call periodically via pg_cron or an edge function.
CREATE OR REPLACE FUNCTION revoke_expired_staff_invitations()
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE staff_invitations
  SET revoked_at = NOW(), updated_at = NOW()
  WHERE accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.revoke_expired_staff_invitations() TO authenticated;