-- Fix Migration 023a: Add missing columns to staff_invitations
-- The live table was created with a subset of columns before migration 023 ran.
-- Since the table is empty, we can safely add all missing columns with constraints.

-- Add missing columns with existence checks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='invited_by') THEN
        ALTER TABLE staff_invitations ADD COLUMN invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='first_name') THEN
        ALTER TABLE staff_invitations ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='last_name') THEN
        ALTER TABLE staff_invitations ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='token') THEN
        ALTER TABLE staff_invitations ADD COLUMN token TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='updated_at') THEN
        ALTER TABLE staff_invitations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Verify all columns are now present
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'staff_invitations'
ORDER BY ordinal_position;