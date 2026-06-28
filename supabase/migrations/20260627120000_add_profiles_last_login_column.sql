-- Add last_login column to profiles so the account session API can display
-- the user's most recent login time. Falls back to created_at in the app
-- layer when this column is NULL.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;
