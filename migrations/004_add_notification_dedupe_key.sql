ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_school_dedupe_key
ON notifications(school_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;
