# 08 — Deploy Gateway Worker

## Prerequisites

1. Cloudflare account with:
   - R2 buckets: `zamschool-assets` (public), `zamschool-uploads` (private) ✅ created
   - KV namespaces: `SESSION_CACHE`, `RATE_LIMITS`
   - (Optional) D1 database: `zamschool-offline`
2. `wrangler` CLI installed: `npm install -g wrangler`
3. Logged in: `wrangler login`

## Step 1: Update `wrangler.toml`

Replace the placeholder IDs in `workers/gateway/wrangler.toml`:

```toml
name = "zamschool-gateway"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "zamschool-assets"

[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "zamschool-uploads"

[[kv_namespaces]]
binding = "SESSION_CACHE"
id = "real-kv-namespace-id-here"       # ← REPLACE

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "real-rate-limit-namespace-id"    # ← REPLACE

[vars]
UPSTREAM_API = "https://your-app.vercel.app"  # ← Your Next.js URL
CORS_ALLOWED_ORIGINS = "https://your-app.vercel.app,http://localhost:3000"
```

## Step 2: Deploy

```bash
cd workers/gateway
wrangler deploy
```

## Step 3: Set secrets (if needed)

```bash
# If your auth verifies JWT signature locally:
echo "your-supabase-jwt-secret" | wrangler secret put SUPABASE_JWT_SECRET
```

## Step 4: Update mobile .env

After deployment, set the Gateway URL in the mobile app:

```env
EXPO_PUBLIC_GATEWAY_URL=https://zamschool-gateway.your-account.workers.dev
```

## Step 5: Update mobile `.env` with R2 public URL

After creating a public R2 URL (Cloudflare Dashboard → R2 → Settings → Public URL):

```env
EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-<your-hash>.r2.dev
```

## Architecture (After Deployment)

```
Mobile App
   │
   ├── EXPO_PUBLIC_GATEWAY_URL set?
   │   ├── YES → All API calls go through Cloudflare Worker Gateway
   │   │            ├── GET requests → cached proxy to web app (Next.js)
   │   │            ├── POST/PUT → mutation queue for offline resilience
   │   │            ├── File uploads → direct to R2 bucket
   │   │            └── Image requests → Cloudflare Images CDN
   │   │
   │   └── NO → Falls back to direct web app calls (original behavior)
   │               ├── apiRequest() → web app origin
   │               └── File uploads → web app → R2
   │
   └── EXPO_PUBLIC_R2_PUBLIC_URL set?
       └── YES → File download URLs point directly to R2 CDN (no server hop)
```

## Rollback

If the Gateway has issues, unset `EXPO_PUBLIC_GATEWAY_URL` in the mobile .env.
The app falls back to direct web app calls automatically.
