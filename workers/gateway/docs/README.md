# ZamSchool Cloudflare Gateway Worker

Edge gateway for the Next.js `/api/*` proxy pattern. The Worker mirrors Next.js API paths — no URL rewrite prefix. Clients opt in via `NEXT_PUBLIC_GATEWAY_URL`; when unset, Next.js dev and production continue calling local `/api/*` routes directly.

## Architecture

```
Browser / Mobile
      │
      │  NEXT_PUBLIC_GATEWAY_URL set? (optional)
      ▼
Cloudflare Worker (this package)
      │
      ├── GET  /api/*     → proxy to UPSTREAM_API (Next.js), cache hot reads
      ├── POST /api/*     → proxy or offline DO queue (selected paths)
      ├── POST /api/upload → authorize via Next.js, write R2
      └── GET  /api/files/* → serve from R2 UPLOADS_BUCKET
      ▼
UPSTREAM_API (Vercel / Next.js) — source of truth for auth + business logic
```

## Route map

| Route | Method | Handler | Notes |
|-------|--------|---------|-------|
| `/api/upload` | POST | R2 upload | Calls `UPSTREAM_API/api/files/authorize-upload` first |
| `/api/files/:key` | GET | R2 download | Private uploads bucket |
| Cacheable `/api/*` | GET | Cached proxy | See `CACHEABLE_GET_PREFIXES` in `src/types.ts` |
| Other `/api/*` | GET | Proxy | No edge cache |
| Queuable `/api/*` | POST/PUT/PATCH/DELETE | Proxy or DO queue | See `QUEUABLE_MUTATION_PATHS` in `src/types.ts` |
| Other `/api/*` | POST/PUT/PATCH/DELETE | Proxy | Requires valid JWT |

## Bindings (real setup)

Create resources in the Cloudflare dashboard, then replace placeholder IDs in `wrangler.toml` (or copy from `wrangler.toml.example`).

| Binding | Type | Purpose | Create with |
|---------|------|---------|-------------|
| `ASSETS_BUCKET` | R2 | Public assets | `wrangler r2 bucket create zamschool-assets` |
| `UPLOADS_BUCKET` | R2 | Private uploads | `wrangler r2 bucket create zamschool-uploads` |
| `SESSION_CACHE` | KV | JWT session snapshots for offline reads | `wrangler kv namespace create SESSION_CACHE` |
| `RATE_LIMITS` | KV | Edge rate-limit counters (stub) | `wrangler kv namespace create RATE_LIMITS` |
| `SCHOOL_DB` | D1 | Offline read replica (optional) | `wrangler d1 create zamschool-offline` |
| `SYNC_QUEUE` | Durable Object | Per-school offline mutation queue | Declared in `wrangler.toml` migrations |

### Non-secret vars (`[vars]`)

| Variable | Example | Description |
|----------|---------|-------------|
| `UPSTREAM_API` | `https://app.zamschool.com` | Next.js deployment URL (no trailing slash) |
| `CORS_ALLOWED_ORIGINS` | `https://app.zamschool.com,http://localhost:3000` | Comma-separated allowed Origins |
| `JWT_VERIFY_MODE` | `signature` | `signature` (prod) or `decode` (local only) |
| `SUPABASE_JWT_ISSUER` | `https://xxx.supabase.co/auth/v1` | Optional issuer validation |
| `SUPABASE_JWT_AUDIENCE` | `authenticated` | Default audience check |
| `RATE_LIMIT_ENABLED` | `true` | Enable KV rate limits at the edge |
| `ALLOW_INSECURE_JWT_DECODE` | `true` | **Local wrangler dev only** — never in production |

### Secrets (`wrangler secret put`)

| Secret | Source |
|--------|--------|
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Secret |

## Next.js integration (no env flag = no change)

Next.js does **not** require the gateway for local dev:

```env
# .env.local — leave empty to use same-origin /api/*
NEXT_PUBLIC_GATEWAY_URL=
```

When ready for edge routing (mobile or web):

```env
NEXT_PUBLIC_GATEWAY_URL=https://zamschool-gateway.<account>.workers.dev
```

`lib/gateway-read-client.ts` falls back to local `/api/*` when the variable is empty or the gateway errors (404/429/5xx).

## Local development

```bash
cd workers/gateway
npm install

# Minimal local dev (insecure JWT decode — never deploy with these vars)
# Add to wrangler.toml [vars] or use .dev.vars:
#   JWT_VERIFY_MODE=decode
#   ALLOW_INSECURE_JWT_DECODE=true
#   RATE_LIMIT_ENABLED=false

wrangler dev
```

Run tests:

```bash
node --experimental-strip-types --test src/index.test.mjs src/auth.test.mjs
```

## Production deploy

### 1. Provision Cloudflare resources

```bash
cd workers/gateway
wrangler login

wrangler r2 bucket create zamschool-assets
wrangler r2 bucket create zamschool-uploads

wrangler kv namespace create SESSION_CACHE
wrangler kv namespace create RATE_LIMITS

# Optional offline replica + queue
wrangler d1 create zamschool-offline
```

Copy each returned ID into `wrangler.toml` (see `wrangler.toml.example`).

### 2. Configure production vars

Edit `wrangler.toml`:

```toml
[vars]
UPSTREAM_API = "https://your-production-app.vercel.app"
CORS_ALLOWED_ORIGINS = "https://your-production-app.vercel.app"
JWT_VERIFY_MODE = "signature"
RATE_LIMIT_ENABLED = "true"
SUPABASE_JWT_ISSUER = "https://<project-ref>.supabase.co/auth/v1"
```

### 3. Set secrets

```bash
echo "<supabase-jwt-secret>" | wrangler secret put SUPABASE_JWT_SECRET
```

### 4. Deploy

```bash
wrangler deploy
```

Note the workers.dev URL (or attach a custom route in the Cloudflare dashboard).

### 5. Enable clients (optional)

```env
# Web (.env.production)
NEXT_PUBLIC_GATEWAY_URL=https://zamschool-gateway.<account>.workers.dev

# Mobile
EXPO_PUBLIC_GATEWAY_URL=https://zamschool-gateway.<account>.workers.dev
```

### 6. Verify

```bash
# Health: unknown route
curl -i https://zamschool-gateway.<account>.workers.dev/api/health-check

# Authenticated GET (replace TOKEN)
curl -i -H "Authorization: Bearer TOKEN" \
  https://zamschool-gateway.<account>.workers.dev/api/student/dashboard
```

### Rollback

Unset `NEXT_PUBLIC_GATEWAY_URL` / `EXPO_PUBLIC_GATEWAY_URL`. Clients revert to direct Next.js `/api/*` calls with no code changes.

## Observability

```bash
wrangler tail zamschool-gateway
```

Rate-limit responses return `429` with `Retry-After` and `X-RateLimit-*` headers.
