ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS attendance_date DATE;

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS session_name TEXT;

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS session_time TIME;

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance'
      AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE public.attendance
    ADD COLUMN recorded_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

UPDATE public.attendance
SET attendance_date = COALESCE(attendance_date, date),
    date = COALESCE(date, attendance_date)
WHERE attendance_date IS NULL
   OR date IS NULL
   OR attendance_date IS DISTINCT FROM date;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance'
      AND column_name = 'marked_by'
  ) THEN
    EXECUTE $sql$
      UPDATE public.attendance
      SET recorded_by = marked_by
      WHERE recorded_by IS NULL
        AND marked_by IS NOT NULL
    $sql$;
  END IF;
END $$;

DROP CONSTRAINT IF EXISTS attendance_roll_call_unique;
DROP INDEX IF EXISTS attendance_roll_call_key;

CREATE UNIQUE INDEX attendance_roll_call_key
ON public.attendance (
  school_id,
  class_id,
  student_id,
  attendance_date,
  session_name,
  session_time
);

ALTER TABLE public.attendance
ADD CONSTRAINT attendance_roll_call_unique
UNIQUE USING INDEX attendance_roll_call_key;
