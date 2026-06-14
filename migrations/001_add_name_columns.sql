-- Migration: Add first_name and last_name columns to profiles table
-- This migration adds the missing columns that the user creation API expects

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='first_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='last_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Update existing records to populate first_name and last_name from name field (if name column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='name') THEN
        UPDATE profiles
        SET 
            first_name = SPLIT_PART(name, ' ', 1),
            last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        WHERE name IS NOT NULL 
          AND name != '' 
          AND first_name IS NULL 
          AND POSITION(' ' IN name) > 0;

        UPDATE profiles
        SET first_name = name
        WHERE name IS NOT NULL 
          AND name != '' 
          AND first_name IS NULL;
    END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN profiles.first_name IS 'User first name for display purposes';
COMMENT ON COLUMN profiles.last_name IS 'User last name for display purposes';
