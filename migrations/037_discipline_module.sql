-- Migration 037: Discipline module
-- Creates discipline_records, discipline_actions, and discipline_categories tables

-- ============================================================================
-- STEP 1: Discipline categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS discipline_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name)
);

ALTER TABLE discipline_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discipline_categories_school_access ON discipline_categories;
CREATE POLICY discipline_categories_school_access ON discipline_categories
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() AND public.is_admin_role())
  WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS discipline_categories_staff_read ON discipline_categories;
CREATE POLICY discipline_categories_staff_read ON discipline_categories
  FOR SELECT TO authenticated
  USING (school_id = public.get_my_school_id());

-- ============================================================================
-- STEP 2: Discipline records (incidents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discipline_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  category_id UUID REFERENCES discipline_categories(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_location TEXT,
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'escalated', 'closed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE discipline_records ENABLE ROW LEVEL SECURITY;

-- Admins see all records in their school
DROP POLICY IF EXISTS discipline_records_admin_all ON discipline_records;
CREATE POLICY discipline_records_admin_all ON discipline_records
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() AND public.is_admin_role())
  WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

-- Teachers see records for their assigned classes
DROP POLICY IF EXISTS discipline_records_teacher_read ON discipline_records;
CREATE POLICY discipline_records_teacher_read ON discipline_records
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND private.is_teacher()
    AND class_id = ANY (private.accessible_class_ids())
  );

-- Teachers can create records for their assigned classes
DROP POLICY IF EXISTS discipline_records_teacher_insert ON discipline_records;
CREATE POLICY discipline_records_teacher_insert ON discipline_records
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND private.is_teacher()
    AND class_id = ANY (private.accessible_class_ids())
  );

-- Students see their own records
DROP POLICY IF EXISTS discipline_records_student_own ON discipline_records;
CREATE POLICY discipline_records_student_own ON discipline_records
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND student_id = ANY (private.accessible_student_ids())
  );

-- Parents see records for their linked children
DROP POLICY IF EXISTS discipline_records_parent_own ON discipline_records;
CREATE POLICY discipline_records_parent_own ON discipline_records
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND student_id IN (
      SELECT ps.student_id FROM parent_students ps
      JOIN parents p ON p.id = ps.parent_id
      WHERE p.profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_discipline_records_school_student ON discipline_records(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_school_status ON discipline_records(school_id, status);
CREATE INDEX IF NOT EXISTS idx_discipline_records_class ON discipline_records(class_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_incident_date ON discipline_records(incident_date);

-- ============================================================================
-- STEP 3: Discipline actions (consequences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discipline_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES discipline_records(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'detention', 'suspension', 'expulsion', 'community_service', 'parent_meeting', 'counseling', 'other')),
  description TEXT,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_days INTEGER,
  issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE discipline_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discipline_actions_school_access ON discipline_actions;
CREATE POLICY discipline_actions_school_access ON discipline_actions
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() AND public.is_admin_role())
  WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS discipline_actions_record_access ON discipline_actions;
CREATE POLICY discipline_actions_record_access ON discipline_actions
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND record_id IN (
      SELECT id FROM discipline_records
      WHERE school_id = public.get_my_school_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_discipline_actions_record ON discipline_actions(record_id);
CREATE INDEX IF NOT EXISTS idx_discipline_actions_type ON discipline_actions(school_id, action_type);
