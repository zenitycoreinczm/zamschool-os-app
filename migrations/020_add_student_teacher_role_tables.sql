-- ============================================================================
-- MIGRATION 020: Student and Teacher Role Tables
-- Adds canonical writable role-detail tables while keeping profiles as the
-- source of identity, tenancy, and role membership.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  admission_number TEXT,
  student_number TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  enrollment_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT students_profile_id_unique UNIQUE (profile_id),
  CONSTRAINT students_id_matches_profile CHECK (id = profile_id)
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  employee_number TEXT,
  employee_id TEXT,
  teacher_identifier TEXT,
  department TEXT,
  specialization TEXT,
  hire_date DATE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teachers_profile_id_unique UNIQUE (profile_id),
  CONSTRAINT teachers_id_matches_profile CHECK (id = profile_id)
);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS admission_number TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enrollment_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS teacher_identifier TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_role_table_profile_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.profile_id IS NULL THEN
    NEW.profile_id := NEW.id;
  END IF;

  IF NEW.id IS NULL THEN
    NEW.id := NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS students_set_profile_id ON public.students;
CREATE TRIGGER students_set_profile_id
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_role_table_profile_id();

DROP TRIGGER IF EXISTS teachers_set_profile_id ON public.teachers;
CREATE TRIGGER teachers_set_profile_id
  BEFORE INSERT ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_role_table_profile_id();

DROP TRIGGER IF EXISTS students_updated_at ON public.students;
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS teachers_updated_at ON public.teachers;
CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_profile_id_unique ON public.students(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_profile_id_unique ON public.teachers(profile_id);

INSERT INTO public.students (
  id,
  profile_id,
  school_id,
  admission_number,
  student_number,
  class_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.id,
  p.school_id,
  p.admission_number,
  p.admission_number,
  p.class_id,
  COALESCE(LOWER(p.status) <> 'inactive', true),
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM public.profiles p
WHERE LOWER(CAST(p.role AS TEXT)) = 'student'
  AND p.school_id IS NOT NULL
ON CONFLICT (profile_id) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  admission_number = COALESCE(public.students.admission_number, EXCLUDED.admission_number),
  student_number = COALESCE(public.students.student_number, EXCLUDED.student_number),
  class_id = COALESCE(public.students.class_id, EXCLUDED.class_id),
  is_active = COALESCE(public.students.is_active, EXCLUDED.is_active),
  updated_at = now();

INSERT INTO public.teachers (
  id,
  profile_id,
  school_id,
  employee_number,
  employee_id,
  teacher_identifier,
  department,
  specialization,
  phone,
  is_active,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.id,
  p.school_id,
  p.employee_id,
  p.employee_id,
  p.employee_id,
  NULL,
  NULL,
  p.phone,
  COALESCE(LOWER(p.status) <> 'inactive', true),
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM public.profiles p
WHERE LOWER(CAST(p.role AS TEXT)) = 'teacher'
  AND p.school_id IS NOT NULL
ON CONFLICT (profile_id) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  employee_number = COALESCE(public.teachers.employee_number, EXCLUDED.employee_number),
  employee_id = COALESCE(public.teachers.employee_id, EXCLUDED.employee_id),
  teacher_identifier = COALESCE(public.teachers.teacher_identifier, EXCLUDED.teacher_identifier),
  department = COALESCE(public.teachers.department, EXCLUDED.department),
  specialization = COALESCE(public.teachers.specialization, EXCLUDED.specialization),
  phone = COALESCE(public.teachers.phone, EXCLUDED.phone),
  is_active = COALESCE(public.teachers.is_active, EXCLUDED.is_active),
  updated_at = now();

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON public.teachers(profile_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_self_read ON public.students;
DROP POLICY IF EXISTS students_admin_manage ON public.students;
DROP POLICY IF EXISTS teachers_self_read ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_manage ON public.teachers;

CREATE POLICY students_self_read ON public.students
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND profile_id = auth.uid()
  );

CREATE POLICY students_admin_manage ON public.students
  FOR ALL TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

CREATE POLICY teachers_self_read ON public.teachers
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND profile_id = auth.uid()
  );

CREATE POLICY teachers_admin_manage ON public.teachers
  FOR ALL TO authenticated
  USING (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  )
  WITH CHECK (
    school_id = public.get_my_school_id()
    AND public.is_admin_role()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teachers TO authenticated;
