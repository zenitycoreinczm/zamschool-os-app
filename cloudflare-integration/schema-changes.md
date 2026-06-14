# Database Schema Changes

## Migration: `017_add_file_attachments.sql`

```sql
-- Assignments: teacher can attach a file (e.g., assignment brief PDF)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Submissions: student can upload completed work
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS submission_file_url TEXT,
  ADD COLUMN IF NOT EXISTS submission_file_name TEXT;

-- Announcements: attach supporting documents
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Payments: attach receipts / proof of payment
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Finance records: attach invoices, receipts
ALTER TABLE finance_records
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Messages: attach files to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;
```

## Column Reference

| Table | New Column | Type | Purpose | Max Size |
|---|---|---|---|---|
| `assignments` | `attachment_url` | TEXT | Teacher's assignment file URL | ~500 chars |
| `assignments` | `attachment_name` | TEXT | Original filename for display | ~255 chars |
| `assignment_submissions` | `submission_file_url` | TEXT | Student's submitted file URL | ~500 chars |
| `assignment_submissions` | `submission_file_name` | TEXT | Original filename | ~255 chars |
| `announcements` | `attachment_url` | TEXT | Announcement attachment URL | ~500 chars |
| `announcements` | `attachment_name` | TEXT | Original filename | ~255 chars |
| `payments` | `receipt_url` | TEXT | Payment receipt/image URL | ~500 chars |
| `finance_records` | `attachment_url` | TEXT | Invoice/receipt URL | ~500 chars |
| `finance_records` | `attachment_name` | TEXT | Original filename | ~255 chars |
| `messages` | `attachment_url` | TEXT | Message attachment URL | ~500 chars |
| `messages` | `attachment_name` | TEXT | Original filename | ~255 chars |

## No Index Changes Needed

All new columns are TEXT type and used only for display/storage — no filtering or joining on them. Existing indexes suffice.

## Rollback

```sql
ALTER TABLE assignments DROP COLUMN IF EXISTS attachment_url, DROP COLUMN IF EXISTS attachment_name;
ALTER TABLE assignment_submissions DROP COLUMN IF EXISTS submission_file_url, DROP COLUMN IF EXISTS submission_file_name;
ALTER TABLE announcements DROP COLUMN IF EXISTS attachment_url, DROP COLUMN IF EXISTS attachment_name;
ALTER TABLE payments DROP COLUMN IF EXISTS receipt_url;
ALTER TABLE finance_records DROP COLUMN IF EXISTS attachment_url, DROP COLUMN IF EXISTS attachment_name;
ALTER TABLE messages DROP COLUMN IF EXISTS attachment_url, DROP COLUMN IF EXISTS attachment_name;
```
