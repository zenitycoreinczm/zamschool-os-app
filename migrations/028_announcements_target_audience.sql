-- Canonical announcement audience (charter target_audience)

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_audience text;

UPDATE public.announcements
SET target_audience = CASE
  WHEN target_class_id IS NOT NULL AND trim(target_class_id::text) <> '' THEN 'class:' || target_class_id::text
  WHEN target_role IS NULL OR trim(target_role) = '' THEN 'all'
  ELSE lower(trim(target_role))
END
WHERE target_audience IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_school_audience ON public.announcements(school_id, target_audience);