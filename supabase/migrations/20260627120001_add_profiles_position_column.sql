-- Add position column to profiles for staff job titles (e.g. "Senior
-- Registrar", "Finance Officer"). Distinct from department which tracks
-- the organisational unit.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS position text;
