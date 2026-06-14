# 03 — Generic File Upload API

Build a reusable upload endpoint that all features (assignments, submissions, announcements, payments, messages) can use.

## API Endpoints

### `POST /api/files/upload`

Upload a file to R2.

**Request:** `multipart/form-data`
- `file`: File (required)
- `entityType`: string — one of `assignment`, `submission`, `announcement`, `receipt`, `message`, `avatar`, `document`
- `schoolId`: string (from auth context)

**Response:**
```json
{
  "key": "schoolId/assignment/userId/1234567890-report.pdf",
  "url": "https://...",
  "size": 123456,
  "mimeType": "application/pdf",
  "originalName": "report.pdf"
}
```

**Implementation:**

```typescript
// app/api/files/upload/route.ts
import { requireActorContext } from '@/lib/server-auth';
import { uploadFile, buildKey } from '@/lib/r2-client';
import { validateFileUpload } from '@/lib/image-optimization';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ENTITY_TYPES = ['assignment', 'submission', 'announcement', 'receipt', 'message', 'avatar', 'document'] as const;

export async function POST(req: NextRequest) {
  const ctx = await requireActorContext(req, ['ADMIN', 'TEACHER', 'STUDENT', 'PAYMENTS']);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const entityType = formData.get('entityType') as string;

  if (!file || !entityType || !ALLOWED_ENTITY_TYPES.includes(entityType as any)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const validation = validateFileUpload(file.name, file.size);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildKey(ctx.schoolId, entityType, ctx.profile.id, file.name);

  const result = await uploadFile(key, buffer, { contentType: file.type });

  return NextResponse.json({
    key: result.key,
    url: result.url,
    size: file.size,
    mimeType: file.type,
    originalName: file.name,
  });
}
```

### `DELETE /api/files`

Delete a file from R2.

**Request:**
```json
{
  "key": "schoolId/assignment/userId/filename.pdf",
  "bucket": "uploads"
}
```

## Client-Side Helper

Add to `lib/api-client.ts`:

```typescript
export async function uploadFile(file: File, entityType: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);
  const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
```

## Rate Limiting

Add rate limit category in `lib/rate-limit.ts`:
```typescript
'file_upload': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 uploads per minute
```
