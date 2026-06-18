# Integration Guide

## External Services

| Service | Purpose | Integration Point |
|---------|---------|-----------------|
| Supabase | Database, Auth, Realtime | Direct (supabase-js + SSR) |
| Cloudflare R2 | File storage, CDN | AWS S3 SDK |
| Redis | Caching | ioredis |
| SMTP (Nodemailer) | Transactional emails | Nodemailer |

## Supabase Integration

### Connection
- **Client**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Server**: `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- **SSR**: `@supabase/ssr` package for server-side session handling

### Auth Flow
1. Login via `/login` page
2. OTP verification via `/api/auth/verify-otp`
3. MFA enrollment/challenge flow via `/api/auth/mfa/*`
4. Session maintained via Supabase SSR cookies
5. Middleware validates session on every protected route request

### Database
- 48 migrations applied for full schema
- RLS enforced on all tables
- Real-time enabled for messages and notifications
- Multi-tenant via school_id column

## Cloudflare R2 Integration

See [CDN_AND_R2.md](CDN_AND_R2.md) for full details.

### Key Points
- S3-compatible API via `@aws-sdk/client-s3`
- Bucket: `zamschool-assets`
- Avatar upload/resize with Sharp
- Public URL with CDN caching

## Redis Caching

### Usage
- API response caching for frequently accessed endpoints
- Session cache for rate limiting
- ioredis client for Redis operations

### Cache Strategy
- Short TTL for dynamic data (dashboard, summaries)
- Longer TTL for reference data (class lists, subjects)
- Cache invalidation on data mutations

## Email (Nodemailer)

### Usage
- Password reset emails
- Staff invitation emails
- Notification emails

### Configuration
- SMTP credentials via environment variables
- `test-email` API route for testing configuration

## API Client Integration

### Authenticated Requests
```typescript
// Client-side
const response = await fetch('/api/admin/classes', {
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### File Upload
```typescript
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData,
});
```

### MFA Challenge
```typescript
// Enroll
await fetch('/api/auth/mfa/enroll', { method: 'POST' });
// Challenge
await fetch('/api/auth/mfa/challenge', { method: 'POST', body: JSON.stringify({ factorId }) });
// Verify
await fetch('/api/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) });