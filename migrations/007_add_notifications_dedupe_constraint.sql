DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_school_dedupe_key_unique'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_school_dedupe_key_unique
    UNIQUE (school_id, dedupe_key);
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_notifications_school_dedupe_key;
