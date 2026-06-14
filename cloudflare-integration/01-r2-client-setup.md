# 01 — R2 Client Setup

## Status: ✅ VERIFIED (2026-05-13)

- R2 endpoint: `https://896192f86427d56d9064f8c7d9f54efe.r2.cloudflarestorage.com`
- Buckets created: `zamschool-assets` (public), `zamschool-uploads` (private)
- All CRUD operations tested (upload, list, read, delete)

## Implementation

### 1. Create `lib/r2-client.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand as GetPresignedCommand, PutObjectCommand as PutPresignedCommand } from '@aws-sdk/client-s3';

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ASSETS_BUCKET = process.env.R2_ASSETS_BUCKET || 'zamschool-assets';
const R2_UPLOADS_BUCKET = process.env.R2_UPLOADS_BUCKET || 'zamschool-uploads';

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export type UploadOptions = {
  bucket?: 'assets' | 'uploads';
  contentType?: string;
};

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  options?: UploadOptions
): Promise<{ url: string; key: string }> {
  const bucket = options?.bucket === 'uploads' ? R2_UPLOADS_BUCKET : R2_ASSETS_BUCKET;
  const c = getR2Client();
  await c.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: options?.contentType,
  }));
  return { url: `/${bucket}/${key}`, key };
}

export async function deleteFile(key: string, bucket: 'assets' | 'uploads' = 'assets'): Promise<void> {
  const b = bucket === 'uploads' ? R2_UPLOADS_BUCKET : R2_ASSETS_BUCKET;
  await getR2Client().send(new DeleteObjectCommand({ Bucket: b, Key: key }));
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  bucket: 'assets' | 'uploads' = 'uploads',
  expiresIn = 900
): Promise<string> {
  const b = bucket === 'uploads' ? R2_UPLOADS_BUCKET : R2_ASSETS_BUCKET;
  const command = new PutPresignedCommand({
    Bucket: b,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  bucket: 'assets' | 'uploads' = 'uploads',
  expiresIn = 3600
): Promise<string> {
  const b = bucket === 'uploads' ? R2_UPLOADS_BUCKET : R2_ASSETS_BUCKET;
  const command = new GetPresignedCommand({ Bucket: b, Key: key });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export function buildKey(schoolId: string, entityType: string, userId: string, filename: string): string {
  return `${schoolId}/${entityType}/${userId}/${Date.now()}-${filename}`;
}
```

### 2. Verify in `.env.local`

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_ASSETS_BUCKET=zamschool-assets
R2_UPLOADS_BUCKET=zamschool-uploads
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

Copy `R2_PUBLIC_URL` from **R2 → zamschool-assets → Settings → Public Development URL** (enable if needed), or run:

```bash
node --env-file=.env.local scripts/discover-r2-public-url.mjs
```

### 3. Update `.env.example`

```env
# Cloudflare R2
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ASSETS_BUCKET=zamschool-assets
R2_UPLOADS_BUCKET=zamschool-uploads
```
