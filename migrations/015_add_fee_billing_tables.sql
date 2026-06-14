-- ============================================================================
-- MIGRATION 015: Fee Billing Tables
-- Adds fee definitions and per-student billing records for school fee management.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. fees table — Fee definitions for schools
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 30,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fees_frequency_check CHECK (frequency IN ('monthly', 'termly', 'once-off')),
  CONSTRAINT fees_amount_positive CHECK (amount > 0)
);

-- ----------------------------------------------------------------------------
-- 2. student_fees table — Per-student billing records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_fees_status_check CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'WAIVED')),
  CONSTRAINT student_fees_amount_due_positive CHECK (amount_due > 0),
  CONSTRAINT student_fees_amount_paid_nonneg CHECK (amount_paid >= 0),
  UNIQUE(student_id, fee_id, billing_month)
);

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fees_school_id ON fees(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_is_active ON fees(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id ON student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(school_id, status);
CREATE INDEX IF NOT EXISTS idx_student_fees_billing_month ON student_fees(school_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON student_fees(due_date) WHERE status != 'PAID';

-- ----------------------------------------------------------------------------
-- 4. Row-Level Security (RLS)
--    Mirrors the payments policies from migration 010.
-- ----------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS fees_read ON fees;
DROP POLICY IF EXISTS fees_insert ON fees;
DROP POLICY IF EXISTS fees_update ON fees;
DROP POLICY IF EXISTS fees_delete ON fees;

DROP POLICY IF EXISTS student_fees_read ON student_fees;
DROP POLICY IF EXISTS student_fees_insert ON student_fees;
DROP POLICY IF EXISTS student_fees_update ON student_fees;
DROP POLICY IF EXISTS student_fees_delete ON student_fees;

-- fees policies
CREATE POLICY fees_read ON fees
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY fees_insert ON fees
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY fees_update ON fees
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY fees_delete ON fees
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- student_fees policies
CREATE POLICY student_fees_read ON student_fees
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY student_fees_insert ON student_fees
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY student_fees_update ON student_fees
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND (public.is_admin_role() OR public.is_payments_role())
    );

CREATE POLICY student_fees_delete ON student_fees
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ----------------------------------------------------------------------------
-- 5. Auto-update updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fees_updated_at ON fees;
CREATE TRIGGER fees_updated_at
    BEFORE UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS student_fees_updated_at ON student_fees;
CREATE TRIGGER student_fees_updated_at
    BEFORE UPDATE ON student_fees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
