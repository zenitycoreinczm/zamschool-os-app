-- Migration 035: Ensure staff_invitations has ALL required columns
-- Migration 023 used CREATE TABLE IF NOT EXISTS which skips column additions
-- if the table already existed. Migration 023a only added 5 columns.
-- This migration adds any remaining missing columns.

DO $$
BEGIN
    -- department
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='department') THEN
        ALTER TABLE staff_invitations ADD COLUMN department TEXT;
    END IF;

    -- position
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='position') THEN
        ALTER TABLE staff_invitations ADD COLUMN position TEXT;
    END IF;

    -- phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='phone') THEN
        ALTER TABLE staff_invitations ADD COLUMN phone TEXT;
    END IF;

    -- temporary_password
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='temporary_password') THEN
        ALTER TABLE staff_invitations ADD COLUMN temporary_password TEXT;
    END IF;

    -- expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='expires_at') THEN
        ALTER TABLE staff_invitations ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- accepted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='accepted_at') THEN
        ALTER TABLE staff_invitations ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- accepted_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='accepted_by') THEN
        ALTER TABLE staff_invitations ADD COLUMN accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- revoked_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='revoked_at') THEN
        ALTER TABLE staff_invitations ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- role (user_role type)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='role') THEN
        ALTER TABLE staff_invitations ADD COLUMN role user_role;
    END IF;

    -- email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='email') THEN
        ALTER TABLE staff_invitations ADD COLUMN email TEXT;
    END IF;

    -- school_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='school_id') THEN
        ALTER TABLE staff_invitations ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
    END IF;

    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='staff_invitations' AND column_name='created_at') THEN
        ALTER TABLE staff_invitations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_staff_invitations_school_email ON staff_invitations(school_id, email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_school_status ON staff_invitations(school_id, accepted_at, revoked_at);
