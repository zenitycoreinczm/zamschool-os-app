-- ============================================================================
-- MIGRATION 030: PRODUCTION DATA INTEGRITY LOCKS
-- Adds unique constraints to prevent duplicate data at the database level.
-- Run this in the Supabase SQL editor BEFORE deploying the code changes.
-- ============================================================================

-- 1. RESULTS TABLE: prevent duplicate (student_id + assignment_id)
ALTER TABLE public.results
  DROP CONSTRAINT IF EXISTS results_student_assignment_unique;
ALTER TABLE public.results
  ADD CONSTRAINT results_student_assignment_unique
  UNIQUE (student_id, assignment_id);

-- 2. ASSIGNMENTS TABLE: prevent duplicate exam titles per class+subject
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_class_subject_title_unique;
ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_class_subject_title_unique
  UNIQUE (school_id, class_id, subject_id, title);

-- 3. EXAMS TABLE: prevent duplicate exam records (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exams') THEN
    ALTER TABLE public.exams
      DROP CONSTRAINT IF EXISTS exams_class_subject_title_unique;
    ALTER TABLE public.exams
      ADD CONSTRAINT exams_class_subject_title_unique
      UNIQUE (school_id, class_id, subject_id, title);
  END IF;
END $$;

-- 4. STUDENTS: unique exam_number within a school (partial, ignores nulls)
DROP INDEX IF EXISTS public.students_number_school_unique;
CREATE UNIQUE INDEX IF NOT EXISTS students_number_school_unique
  ON public.students (school_id, student_number)
  WHERE student_number IS NOT NULL;
