-- Migration: Add payments role support and enhance role constraints
-- This migration ensures the payments role is properly supported
-- IMPORTANT: Run this AFTER running the main migration (run_this_in_supabase_sql_editor.sql)

-- ============================================================================
-- STEP 1: Update role column constraints to include payments role
-- ============================================================================

-- Add CHECK constraint to ensure only valid roles are allowed
DO $$
BEGIN
    -- Remove existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    -- Add updated constraint with payments role (only if profiles table has role column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'payments'));
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update existing RLS policies to handle payments role
-- ============================================================================

-- Recreate the profiles policies without restoring school-wide write access
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'school_id'
    ) THEN
        DROP POLICY IF EXISTS profiles_isolation_policy ON profiles;
        DROP POLICY IF EXISTS profile_isolation_policy ON profiles;
        DROP POLICY IF EXISTS admin_manage_all ON profiles;
        DROP POLICY IF EXISTS profiles_select_own_or_admin ON profiles;
        DROP POLICY IF EXISTS profiles_admin_insert ON profiles;
        DROP POLICY IF EXISTS profiles_admin_update ON profiles;
        DROP POLICY IF EXISTS profiles_admin_delete ON profiles;

        CREATE POLICY profiles_select_own_or_admin ON profiles
            FOR SELECT TO authenticated
            USING (
                id = auth.uid()
                OR (school_id = get_my_school_id() AND LOWER(COALESCE(get_my_role(), '')) = 'admin')
            );

        CREATE POLICY profiles_admin_insert ON profiles
            FOR INSERT TO authenticated
            WITH CHECK (
                school_id = get_my_school_id()
                AND LOWER(COALESCE(get_my_role(), '')) = 'admin'
            );

        CREATE POLICY profiles_admin_update ON profiles
            FOR UPDATE TO authenticated
            USING (
                school_id = get_my_school_id()
                AND LOWER(COALESCE(get_my_role(), '')) = 'admin'
            )
            WITH CHECK (
                school_id = get_my_school_id()
                AND LOWER(COALESCE(get_my_role(), '')) = 'admin'
            );

        CREATE POLICY profiles_admin_delete ON profiles
            FOR DELETE TO authenticated
            USING (
                school_id = get_my_school_id()
                AND LOWER(COALESCE(get_my_role(), '')) = 'admin'
            );
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add payments-specific indexes for performance
-- ============================================================================

-- Only create indexes if payments table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payments' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_student_status ON payments(student_id, status);
        CREATE INDEX IF NOT EXISTS idx_payments_school_status ON payments(school_id, status);
    END IF;
END $$;

-- Only create finance_records indexes if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'finance_records' AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_finance_records_type ON finance_records(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_finance_records_date ON finance_records(transaction_date);
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add payment-related functions and triggers
-- ============================================================================

-- Function to update payment status when paid_at is set (only if payments table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payments' AND table_schema = 'public'
    ) THEN
        CREATE OR REPLACE FUNCTION update_payment_status()
        RETURNS TRIGGER AS $payment_trigger$
        BEGIN
            IF NEW.paid_at IS NOT NULL AND OLD.status = 'PENDING' THEN
                NEW.status := 'PAID';
            END IF;
            RETURN NEW;
        END;
        $payment_trigger$ LANGUAGE plpgsql;

        -- Create trigger to automatically update payment status
        DROP TRIGGER IF EXISTS payment_status_update ON payments;
        CREATE TRIGGER payment_status_update
            BEFORE UPDATE ON payments
            FOR EACH ROW
            EXECUTE FUNCTION update_payment_status();
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create view for payment summaries (only if payments table exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payments' AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) THEN
        DROP VIEW IF EXISTS payment_summaries;
        
        CREATE OR REPLACE VIEW payment_summaries AS
        SELECT 
            p.school_id,
            p.student_id,
            pr.first_name,
            pr.last_name,
            pr.email,
            COUNT(p.id) as total_payments,
            COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) as pending_payments,
            COUNT(CASE WHEN p.status = 'PAID' THEN 1 END) as paid_payments,
            COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as paid_amount,
            COALESCE(SUM(p.amount), 0) as total_amount
        FROM payments p
        JOIN profiles pr ON p.student_id = pr.id
        GROUP BY p.school_id, p.student_id, pr.first_name, pr.last_name, pr.email;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

-- Verify the role constraint was added correctly
SELECT 
    column_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
WHERE cc.constraint_name = 'profiles_role_check';

-- Show current roles in the system
SELECT DISTINCT role, COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;
