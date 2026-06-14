UPDATE public.attendance
SET attendance_date = COALESCE(attendance_date, date),
    date = COALESCE(date, attendance_date)
WHERE attendance_date IS NULL
   OR date IS NULL
   OR attendance_date IS DISTINCT FROM date;

ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_unique_record;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_roll_call_unique'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_roll_call_unique
    UNIQUE USING INDEX attendance_roll_call_key;
  END IF;
END $$;
