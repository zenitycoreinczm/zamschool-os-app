-- Migration 026: Academic tenant RLS (audit task #3).
-- Tenant isolation via public.get_my_school_id(); teachers scoped to assigned classes
-- using existing private.accessible_* helpers. Does not touch profiles, schools, or finance.

GRANT EXECUTE ON FUNCTION private.teacher_can_manage_class(uuid) TO authenticated;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- classes -------------------------------------------------------------------
DROP POLICY IF EXISTS classes_same_school_read ON public.classes;
DROP POLICY IF EXISTS classes_admin_manage ON public.classes;
DROP POLICY IF EXISTS classes_isolation_policy ON public.classes;
DROP POLICY IF EXISTS classes_select_accessible ON public.classes;
DROP POLICY IF EXISTS classes_admin_insert ON public.classes;
DROP POLICY IF EXISTS classes_admin_update ON public.classes;
DROP POLICY IF EXISTS classes_admin_delete ON public.classes;

CREATE POLICY classes_select_accessible ON public.classes
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR id = ANY (private.accessible_class_ids())
    )
  );

CREATE POLICY classes_admin_insert ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY classes_admin_update ON public.classes
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY classes_admin_delete ON public.classes
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

-- students ------------------------------------------------------------------
DROP POLICY IF EXISTS students_select_accessible ON public.students;
DROP POLICY IF EXISTS students_admin_insert ON public.students;
DROP POLICY IF EXISTS students_admin_update ON public.students;
DROP POLICY IF EXISTS students_admin_delete ON public.students;
DROP POLICY IF EXISTS students_isolation_policy ON public.students;
DROP POLICY IF EXISTS students_admin_manage ON public.students;

CREATE POLICY students_select_accessible ON public.students
  FOR SELECT TO authenticated
  USING (
    (
      public.is_admin_role()
      AND school_id = public.get_my_school_id()
    )
    OR (
      school_id = public.get_my_school_id()
      AND id = ANY (private.accessible_student_ids())
    )
  );

CREATE POLICY students_admin_insert ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY students_admin_update ON public.students
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY students_admin_delete ON public.students
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

-- teachers ------------------------------------------------------------------
DROP POLICY IF EXISTS teachers_select_accessible ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_insert ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_update ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_delete ON public.teachers;
DROP POLICY IF EXISTS teachers_isolation_policy ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_manage ON public.teachers;

CREATE POLICY teachers_select_accessible ON public.teachers
  FOR SELECT TO authenticated
  USING (school_id = public.get_my_school_id());

CREATE POLICY teachers_admin_insert ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY teachers_admin_update ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY teachers_admin_delete ON public.teachers
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

-- assignments ---------------------------------------------------------------
DROP POLICY IF EXISTS assignments_admin_manage ON public.assignments;
DROP POLICY IF EXISTS assignments_isolation_policy ON public.assignments;
DROP POLICY IF EXISTS assignments_select_accessible ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_or_admin_insert ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_or_admin_update ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_or_admin_delete ON public.assignments;

CREATE POLICY assignments_select_accessible ON public.assignments
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR class_id = ANY (private.accessible_class_ids())
    )
  );

CREATE POLICY assignments_teacher_or_admin_insert ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class_subject(class_id, subject_id)
      )
    )
  );

CREATE POLICY assignments_teacher_or_admin_update ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class_subject(class_id, subject_id)
      )
    )
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class_subject(class_id, subject_id)
      )
    )
  );

CREATE POLICY assignments_teacher_or_admin_delete ON public.assignments
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class_subject(class_id, subject_id)
      )
    )
  );

-- grades (school grade levels) ----------------------------------------------
DROP POLICY IF EXISTS grades_same_school_read ON public.grades;
DROP POLICY IF EXISTS grades_admin_manage ON public.grades;
DROP POLICY IF EXISTS grades_isolation_policy ON public.grades;
DROP POLICY IF EXISTS grades_select_same_school ON public.grades;
DROP POLICY IF EXISTS grades_admin_all ON public.grades;

CREATE POLICY grades_select_same_school ON public.grades
  FOR SELECT TO authenticated
  USING (school_id = public.get_my_school_id());

CREATE POLICY grades_admin_all ON public.grades
  FOR ALL TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

-- attendance ----------------------------------------------------------------
DROP POLICY IF EXISTS attendance_admin_manage ON public.attendance;
DROP POLICY IF EXISTS attendance_isolation_policy ON public.attendance;
DROP POLICY IF EXISTS attendance_select_accessible ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_or_admin_insert ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_or_admin_update ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_or_admin_delete ON public.attendance;

CREATE POLICY attendance_select_accessible ON public.attendance
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR class_id = ANY (private.accessible_class_ids())
      OR student_id = ANY (private.accessible_student_ids())
    )
  );

CREATE POLICY attendance_teacher_or_admin_insert ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class(class_id)
      )
    )
  );

CREATE POLICY attendance_teacher_or_admin_update ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class(class_id)
      )
    )
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class(class_id)
      )
    )
  );

CREATE POLICY attendance_teacher_or_admin_delete ON public.attendance
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_admin_role()
      OR (
        private.is_teacher()
        AND private.teacher_can_manage_class(class_id)
      )
    )
  );
