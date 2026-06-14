# Environment Variables

## Required (R2)

| Variable | Current Value | Description |
|---|---|---|
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | `<r2-access-key-id>` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | `<r2-secret-access-key>` | R2 secret key |
| `R2_ASSETS_BUCKET` | `zamschool-assets` | Public bucket name |
| `R2_UPLOADS_BUCKET` | `zamschool-uploads` | Private bucket name |
| `R2_PUBLIC_URL` | `https://pub-<hash>.r2.dev` | Browser base URL for assets (no trailing slash); **not** `R2_ENDPOINT` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | same as `R2_PUBLIC_URL` | Exposed to client for Next.js `Image` allowlist |
| `CF_ACCOUNT_ID` | Cloudflare account ID | Used by `scripts/discover-r2-public-url.mjs` |
| `CF_API_TOKEN` | API token with **R2 Read** | Discover/verify public URL; must allow your IP if filtered |

## Optional (Cloudflare Images)

| Variable | Description |
|---|---|
| `CLOUDFLARE_IMAGES_ACCOUNT_ID` | Cloudflare account ID (for Images API) |
| `CLOUDFLARE_IMAGES_TOKEN` | API token with `cloudflare_images:write` |
| `CLOUDFLARE_IMAGES_ACCOUNT_HASH` | Account hash for image delivery URLs |

## Optional (Gateway Worker)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | Worker URL (e.g., `https://gateway.xxxx.workers.dev`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the Worker |

## Optional (KV - replaces Redis)

| Variable | Description |
|---|---|
| `KV_REST_API_URL` | KV REST API endpoint URL |
| `KV_REST_API_TOKEN` | KV API token |

## `.env.example` Update

```env
# === Cloudflare R2 (File Storage) ===
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ASSETS_BUCKET=zamschool-assets
R2_UPLOADS_BUCKET=zamschool-uploads
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-<hash>.r2.dev

# === Cloudflare Images (Image Optimization) ===
CLOUDFLARE_IMAGES_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_IMAGES_ACCOUNT_HASH=

# === Cloudflare Gateway Worker ===
NEXT_PUBLIC_GATEWAY_URL=
CORS_ALLOWED_ORIGINS=https://your-app.example.com

# === Cloudflare KV (Rate Limiting) ===
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## Secrets to Rotate

These credentials have been shared in this conversation and should be rotated:

| Secret | Severity |
|---|---|
| `R2_ACCESS_KEY_ID` | High — allows full R2 access |
| `R2_SECRET_ACCESS_KEY` | High — allows full R2 access |
| `cfat_*` token | High — API token with R2 permissions |

Generate new R2 tokens via Cloudflare Dashboard → R2 → Manage R2 API Tokens.
