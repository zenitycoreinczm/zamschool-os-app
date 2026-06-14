-- Migration 026: Finance tenant RLS policies (task #2).
-- Mirrors lib/server-auth requireFinancialContext roles:
--   BURSAR, PAYMENTS, PRINCIPAL, ADMIN, SUPER_ADMIN — scoped to get_my_school_id().
-- Does not modify profiles or schools policies (owned by task #1).

CREATE OR REPLACE FUNCTION public.is_financial_context_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_role() IN (
    'bursar',
    'payments',
    'principal',
    'head_teacher',
    'admin',
    'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_financial_context_role() TO authenticated;

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_isolation_policy ON public.payments;
DROP POLICY IF EXISTS payments_read_admin_or_payments ON public.payments;
DROP POLICY IF EXISTS payments_insert_admin_or_payments ON public.payments;
DROP POLICY IF EXISTS payments_update_admin_or_payments ON public.payments;
DROP POLICY IF EXISTS payments_delete_admin ON public.payments;
DROP POLICY IF EXISTS payments_read_financial_context ON public.payments;
DROP POLICY IF EXISTS payments_insert_financial_context ON public.payments;
DROP POLICY IF EXISTS payments_update_financial_context ON public.payments;
DROP POLICY IF EXISTS payments_delete_financial_context ON public.payments;

CREATE POLICY payments_read_financial_context ON public.payments
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY payments_insert_financial_context ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY payments_update_financial_context ON public.payments
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY payments_delete_financial_context ON public.payments
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ---------------------------------------------------------------------------
-- finance_records
-- ---------------------------------------------------------------------------
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_records_admin_manage ON public.finance_records;
DROP POLICY IF EXISTS finance_records_isolation_policy ON public.finance_records;
DROP POLICY IF EXISTS finance_records_read_financial_context ON public.finance_records;
DROP POLICY IF EXISTS finance_records_insert_financial_context ON public.finance_records;
DROP POLICY IF EXISTS finance_records_update_financial_context ON public.finance_records;
DROP POLICY IF EXISTS finance_records_delete_financial_context ON public.finance_records;

CREATE POLICY finance_records_read_financial_context ON public.finance_records
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finance_records_insert_financial_context ON public.finance_records
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finance_records_update_financial_context ON public.finance_records
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finance_records_delete_financial_context ON public.finance_records
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ---------------------------------------------------------------------------
-- fees
-- ---------------------------------------------------------------------------
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fees_read ON public.fees;
DROP POLICY IF EXISTS fees_insert ON public.fees;
DROP POLICY IF EXISTS fees_update ON public.fees;
DROP POLICY IF EXISTS fees_delete ON public.fees;
DROP POLICY IF EXISTS fees_read_financial_context ON public.fees;
DROP POLICY IF EXISTS fees_insert_financial_context ON public.fees;
DROP POLICY IF EXISTS fees_update_financial_context ON public.fees;
DROP POLICY IF EXISTS fees_delete_financial_context ON public.fees;

CREATE POLICY fees_read_financial_context ON public.fees
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fees_insert_financial_context ON public.fees
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fees_update_financial_context ON public.fees
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fees_delete_financial_context ON public.fees
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ---------------------------------------------------------------------------
-- student_fees
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_fees_read ON public.student_fees;
DROP POLICY IF EXISTS student_fees_insert ON public.student_fees;
DROP POLICY IF EXISTS student_fees_update ON public.student_fees;
DROP POLICY IF EXISTS student_fees_delete ON public.student_fees;
DROP POLICY IF EXISTS student_fees_read_financial_context ON public.student_fees;
DROP POLICY IF EXISTS student_fees_insert_financial_context ON public.student_fees;
DROP POLICY IF EXISTS student_fees_update_financial_context ON public.student_fees;
DROP POLICY IF EXISTS student_fees_delete_financial_context ON public.student_fees;

CREATE POLICY student_fees_read_financial_context ON public.student_fees
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY student_fees_insert_financial_context ON public.student_fees
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY student_fees_update_financial_context ON public.student_fees
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY student_fees_delete_financial_context ON public.student_fees
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ---------------------------------------------------------------------------
-- finances (legacy ledger table)
-- ---------------------------------------------------------------------------
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finances_admin_all ON public.finances;
DROP POLICY IF EXISTS finances_read_financial_context ON public.finances;
DROP POLICY IF EXISTS finances_insert_financial_context ON public.finances;
DROP POLICY IF EXISTS finances_update_financial_context ON public.finances;
DROP POLICY IF EXISTS finances_delete_financial_context ON public.finances;

CREATE POLICY finances_read_financial_context ON public.finances
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finances_insert_financial_context ON public.finances
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finances_update_financial_context ON public.finances
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY finances_delete_financial_context ON public.finances
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );

-- ---------------------------------------------------------------------------
-- fee_payments (preserve parent/student read; add financial staff access)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_payments_read_financial_context ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_insert_financial_context ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_update_financial_context ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_delete_financial_context ON public.fee_payments;

CREATE POLICY fee_payments_read_financial_context ON public.fee_payments
    FOR SELECT TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fee_payments_insert_financial_context ON public.fee_payments
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fee_payments_update_financial_context ON public.fee_payments
    FOR UPDATE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    )
    WITH CHECK (
        school_id = public.get_my_school_id()
        AND public.is_financial_context_role()
    );

CREATE POLICY fee_payments_delete_financial_context ON public.fee_payments
    FOR DELETE TO authenticated
    USING (
        school_id = public.get_my_school_id()
        AND public.is_admin_role()
    );
