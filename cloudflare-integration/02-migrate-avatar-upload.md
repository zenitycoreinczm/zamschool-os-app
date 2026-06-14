# 02 — Migrate Avatar Upload from Supabase Storage → R2

## Current State

Avatar upload goes through `app/api/account/avatar/route.ts`:
1. Receives base64 image
2. Uploads to Supabase Storage bucket `profile-avatars` via `supabaseAdmin.storage.from().upload()`
3. Gets public URL via `supabaseAdmin.storage.from().getPublicUrl()`
4. Saves URL to `profiles.avatar_url` (or `photo_url` as fallback)

## Target State

1. Receives base64 image (unchanged)
2. Validates + optimizes with `sharp` (already in codebase)
3. Uploads to R2 `zamschool-assets` bucket at path `avatars/{schoolId}/{userId}.webp`
4. Returns R2 public URL
5. Saves to `profiles.avatar_url`

## Changes Required

### `app/api/account/avatar/route.ts`

Replace Supabase Storage calls with R2:

```typescript
// REMOVE:
const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
  .from(AVATAR_BUCKET)
  .upload(objectPath, buffer, { upsert: true, contentType: mimeType });

// ADD:
const { url } = await uploadFile(objectPath, buffer, { contentType: mimeType });
```

Also replace `getPublicUrl`:

```typescript
// REMOVE:
const { data: publicUrlData } = supabaseAdmin.storage
  .from(AVATAR_BUCKET)
  .getPublicUrl(objectPath);

// ADD:
const publicUrl = `${process.env.R2_PUBLIC_URL || `https://${process.env.R2_ASSETS_BUCKET}.r2.cloudflarestorage.com`}/${objectPath}`;
```

### `next.config.ts`

Update the image whitelist:

```typescript
// REMOVE Supabase Storage path:
// pathname: '/storage/v1/object/public/**',

// ADD R2 domains:
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**.r2.cloudflarestorage.com',
  },
  {
    protocol: 'https',
    hostname: '*.cloudflareusercontent.com',  // for Cloudflare Images
  },
],
```

### Backfill Existing Avatars

Run a one-time migration script to copy existing avatars from Supabase Storage to R2:

```typescript
// scripts/migrate-avatars-to-r2.ts
// 1. Query all profiles with non-null avatar_url
// 2. For each, download from Supabase Storage
// 3. Upload to R2
// 4. Update profile.avatar_url to new R2 URL
```
