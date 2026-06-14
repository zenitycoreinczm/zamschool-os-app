# 09 — Cloudflare rate limiting, security, and caching

This playbook matches what ZamSchool OS expects in code (`lib/edge-cache.ts`, `middleware.ts`, gateway worker cache list).

## Phase 2 — Rate limiting (dashboard)

**Security → Rate limiting rules → Create rule.** Start with **Challenge** (not Block) until traffic is understood.

| Rule name | Expression | Rate | Action |
|-----------|------------|------|--------|
| Login protection | `(http.request.uri.path contains "/api/auth/")` | 10 req / 1 min | Challenge |
| General API | `(http.request.uri.path contains "/api/")` | 60 req / 1 min | Challenge |
| Student/parent app | `(http.request.uri.path contains "/parent" or http.request.uri.path contains "/student")` | 100 req / 5 min | Challenge |

Apply **per IP** (or per colo + IP if available).

## Phase 2 — Basic security (dashboard)

**Security** tab:

- Bot Fight Mode: **On**
- Security Level: **Medium**
- Privacy Pass: **Enabled**

## Phase 2 — Response headers (dashboard)

**Rules → Transform Rules → Modify Response Header** (if not already set by origin):

| Header | Value |
|--------|--------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Origin already sends these from `middleware.ts` for app routes.

## Phase 3 — Cache rules (dashboard)

### Rule 1 — Static assets (1 month)

**Expression:**

```
(http.request.uri.path.extension in {"js" "css" "png" "jpg" "jpeg" "svg" "ico" "woff" "woff2"})
```

Edge TTL: 1 month · Browser TTL: 1 month

### Rule 2 — Selective API (10 minutes)

Only for **public or low-risk** GET paths. Do **not** include auth, messages, attendance, or results.

**Expression (example):**

```
(http.request.uri.path contains "/api/admin/announcements" or http.request.uri.path contains "/api/account/announcements")
```

Edge TTL: 10 minutes

Requires origin `Cache-Control` + `Vary: Authorization` (see `lib/edge-cache.ts`).

### Rule 3 — Bypass sensitive routes

**Expression:**

```
(http.request.uri.path contains "/api/auth/" or http.request.uri.path contains "/login" or http.request.uri.path contains "/api/" and (http.request.uri.path contains "/attendance" or http.request.uri.path contains "/results" or http.request.uri.path contains "/messages"))
```

Cache eligibility: **Bypass cache**

## Phase 3 — Origin cache map (implemented in repo)

| Data | Preset | TTL (approx.) |
|------|--------|----------------|
| School settings | `schoolSettings` | 10 min (+ SWR) |
| Announcements | `announcements` | 5 min (+ SWR) |
| Profile read | `profileRead` | 3 min (+ SWR) |
| Dashboard / summaries | `privateRead` | 30 s (+ SWR) |
| Workspace context | `privateWorkspace` | 45 s (+ SWR) |
| Attendance / results / auth / messages | `noStore` | Never |
| Mutations (POST/PUT/PATCH/DELETE) | `noStore` | Never |

Middleware applies defaults on `/api/*`; routes can override with `applyEdgeCacheHeaders()`.

## Phase 4 — Image optimization

**Speed → Optimization:**

- Polish: On
- Mirage: On (optional)

Profile photos and logos should use R2/CDN URLs (`cloudflare-integration/05-cloudflare-images.md`).

## Phase 5 — Later

- Workers: edge auth / rate limits (`workers/gateway`, `08-deploy-gateway-worker.md`)
- KV: optional Redis replacement (`07-kv-rate-limiting.md`)
- Custom WAF when under attack

## Verification

```bash
npm test -- lib/edge-cache.test.mjs
npm run build
npm run cloudflare:status
```

Check a GET response:

```bash
curl -I https://YOUR_DOMAIN/api/health
curl -I -H "Authorization: Bearer TOKEN" https://YOUR_DOMAIN/api/admin/school
```

Expect `Cache-Control`, `CDN-Cache-Control`, and `Vary: Authorization, Cookie` on private reads.