# Cloudflare Integration — ZamSchool OS

## Architecture Overview

```
User's Browser
       |
       v
Next.js App (Vercel / self-hosted)
       |
       v
Cloudflare Worker (gateway) — optional, for direct uploads
       |
       v
 +-----+-----+-----+
 |     |     |     |
 R2   KV   Images CDN
(File  (Rate  (Image
Store) Limit) Opt)
```

## Why Cloudflare?

| Need | Supabase Storage | Cloudflare R2 |
|---|---|---|
| Storage (free) | 1 GB | 10 GB |
| Egress (free) | 2 GB/mo | **Unlimited (zero egress)** |
| Egress overage | $0.09/GB | **$0.00/GB** |
| Global CDN | Limited | Cloudflare edge (330+ cities) |
| Image optimization | Not built-in | Cloudflare Images |

For a school serving many profile photos, assignment files, and documents to hundreds of users, **zero egress** is the killer feature.

## Playbooks

| Doc | Topic |
|-----|--------|
| [09-rate-limiting-security-caching.md](./09-rate-limiting-security-caching.md) | Dashboard rate limits, security headers, cache rules, origin `Cache-Control` map |

## Buckets Created

| Bucket | Visibility | Purpose |
|---|---|---|
| `zamschool-assets` | Public | Avatars, logos, public images |
| `zamschool-uploads` | Private | Assignment files, receipts, documents (presigned URLs) |

## Architecture Decisions

1. **Presigned URLs for private uploads** — never expose R2 keys to the browser. Server generates short-lived (15min) presigned URLs.
2. **School-scoped paths** — all objects stored under `{schoolId}/{entityType}/{userId}/` to prevent cross-tenant access.
3. **Sharp on server for validation** — reuse existing `lib/image-optimization.ts` to validate/resize before upload.
4. **Worker gateway as optional layer** — direct upload from browser to R2 via Worker avoids proxying large files through Next.js.

## Credentials (secure these!)

All credentials go in `.env.local` — **never commit them**.

See `env-variables.md` for the full list.
