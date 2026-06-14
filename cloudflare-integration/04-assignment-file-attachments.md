# 04 — Assignment File Attachments

This is the **highest impact** feature — it fills the current gap where assignments and submissions only support text/URLs.

## Database Migration

Create `migrations/017_add_file_attachments.sql`:

```sql
-- Assignment attachments (teacher uploads assignment files)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Submission file attachments (student uploads completed work)
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS submission_file_url TEXT,
  ADD COLUMN IF NOT EXISTS submission_file_name TEXT;

-- Announcement attachments
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Payment receipts
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Finance record attachments
ALTER TABLE finance_records
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Message attachments
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;
```

## Teacher Side — Assignment Creation

### API: `app/api/teacher/assignments/route.ts`

Update the Zod schema to accept optional `attachmentUrl` and `attachmentName`:

```typescript
const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  dueDate: z.string(),
  totalMarks: z.number().positive(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});
```

### UI: `app/(dashboard)/teacher/assignments/page.tsx`

Add a file picker to the assignment form. The student should see a download link for the attachment.

## Student Side — Submission with Files

### API: `app/api/student/assignments/submissions/route.ts`

Update Zod schema:

```typescript
const upsertSchema = z.object({
  assignmentId: z.string().uuid(),
  submissionText: z.string().optional(),
  submissionLink: z.string().url().optional().or(z.literal('')),
  submissionFileUrl: z.string().optional(),
  submissionFileName: z.string().optional(),
});
```

### UI: `app/student/page.tsx`

Add a file upload button alongside the existing text/URL inputs. Use the generic upload API (`/api/files/upload`) to upload the file first, then include the returned URL in the submission payload.

## File Size Limits

| Context | Max Size | Allowed Types |
|---|---|---|
| Assignment attachment (teacher) | 10 MB | PDF, DOC, DOCX, images, ZIP |
| Submission file (student) | 20 MB | PDF, DOC, DOCX, images, ZIP, video |
| Announcement attachment | 5 MB | PDF, images |
| Payment receipt | 5 MB | PDF, images |
| Message attachment | 5 MB | images, PDF |
