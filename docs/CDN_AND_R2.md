# Cloudflare R2 Integration

## Overview

ZamSchool OS uses Cloudflare R2 (S3-compatible object storage) for avatar images and public asset delivery. R2 provides zero-egress-fee storage with global CDN distribution.

## Infrastructure

### Bucket
- **Name**: `zamschool-assets`
- **Public URL**: `https://pub-<hash>.r2.dev` (configured via `R2_PUBLIC_URL`)

### Routes
- `/api/account/avatar/POST` - Upload avatar to R2
- `/api/account/avatar/media/[schoolId]/[userId]/GET` - Serve avatar via R2 redirect
- `/api/public/assets/[...path]/GET` - Generic CDN proxy (returns 308 redirect to R2)

### Delivery Modes
1. **CDN Direct**: Browser loads from `R2_PUBLIC_URL/<school>/avatars/<userId>` directly
2. **Proxy Mode**: `/api/public/assets/<key>` acts as delivery proxy (for development)

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `R2_ENDPOINT` | Yes | `https://<account>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API secret key |
| `R2_ASSETS_BUCKET` | Yes | Bucket name (`zamschool-assets`) |
| `R2_PUBLIC_URL` | Yes | Public CDN URL (`https://pub-xxxx.r2.dev`) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Yes | Same as R2_PUBLIC_URL (for next/image allowlist) |
| `CF_ACCOUNT_ID` | No | Cloudflare account ID |
| `CF_API_TOKEN` | No | Cloudflare API token |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated browser origins |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run cdn:status` | Check current CDN configuration |
| `npm run cdn:cache-rules` | Verify CDN cache rules are correct |
| `npm run cdn:discover-r2` | Discover R2 public URL |
| `npm run cdn:preflight` | Run full CDN preflight check |

## Usage

### Avatar Upload Flow
1. Client uploads image to `/api/account/avatar` POST
2. Server validates image, resizes with Sharp
3. Server uploads to R2 at path `<schoolId>/avatars/<userId>`
4. Avatar is served via CDN URL: `R2_PUBLIC_URL/<schoolId>/avatars/<userId>`

### CDN Configuration
- Bucket must have public access enabled
- CORS rules must include the app's origin
- Cache-Control headers set on upload for CDN caching
- `next/image` allowlist configured in `next.config.ts` for R2 URLs

## Security

- R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are server-only
- Upload validation prevents arbitrary file types
- Avatar paths are scoped by school_id for tenant isolation
- Public URLs are not guessable (UUID-based paths)