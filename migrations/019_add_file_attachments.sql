-- Add file attachment columns to support Cloudflare R2 file storage
-- Part of the Cloudflare Integration project

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS submission_file_url TEXT,
  ADD COLUMN IF NOT EXISTS submission_file_name TEXT;

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE finance_records
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;
