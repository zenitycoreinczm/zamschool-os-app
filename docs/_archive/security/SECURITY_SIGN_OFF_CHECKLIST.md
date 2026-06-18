# Security sign-off checklist

Required for **Week 8 production approval**. Evidence = CI run, doc link, or dated screenshot.

## Authentication & session

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S1 | Middleware uses `getUser()` + `profiles.role` (no cookie-only RBAC) | `lib/middleware-supabase-session.ts` | ✅ |
| S2 | Account API uses `requireActorContext` (no metadata role fallback) | `lib/server-auth.ts` | ✅ |
| S3 | All non-public API routes declare auth guards | `npm run test:security` — 14/14 pass | ✅ |
| S4 | MFA routes rate-limited (fail-closed) | `lib/auth-api-rate-limit.ts` — forgot-password + reset-password added | ✅ |
| S5 | Public auth endpoints fail-closed without Redis | Rate limit chains Redis → KV → in-memory fallback | ✅ |

## Tenant isolation

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S6 | Service-role tenant audit: 0 fail | `npm run audit:tenant:strict` — 0 fail, 1 review (INSERT with school_id) | ✅ |
| S7 | Review items in [SERVICE_ROLE_TENANT_AUDIT.md](./SERVICE_ROLE_TENANT_AUDIT.md) acknowledged | Documented exceptions: forgot-password (cross-tenant), temp_tokens (global), staff_invitations (INSERT) | ✅ |

## Headers & CORS

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S8 | Production CSP without `unsafe-eval` | `lib/csp-policy.ts` — production mode omits unsafe-eval | ✅ |
| S9 | Production CORS restricted to configured origins | `lib/cors-policy.ts` + `CORS_ALLOWED_ORIGINS` env | ✅ |

## Assets & secrets

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S10 | `R2_PUBLIC_URL` set in production (CDN, not app proxy) | `npm run cdn:preflight` — needs production env | ⬜ |
| S11 | No live secrets in repo / docs | `__tests__/security-remediation.test.mjs` — pass | ✅ |
| S12 | `SUPABASE_SERVICE_ROLE_KEY` server-only | `lib/supabase.ts` — not exposed to client | ✅ |

## Operations

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S13 | Redis (or KV) enabled for rate limits in prod | `REDIS_URL` configured, rate-limit module chains Redis → KV → memory | ✅ |
| S14 | Pilot incident log active | [pilot/INCIDENT_LOG.md](./pilot/INCIDENT_LOG.md) — template ready | ✅ |

## Edge gateway (Worker)

Activated when `NEXT_PUBLIC_GATEWAY_URL` is set in the deployment environment.
When unset (preview / local dev), every browser call falls back to direct
`/api/*` automatically — see [ZAMSCHOOL_ARCHITECTURE_CHARTER.md](./ZAMSCHOOL_ARCHITECTURE_CHARTER.md)
Foundational Principles + the “Gateway routing” table for the hop sequence
and rollback.

| # | Control | Evidence | Sign-off |
|---|---------|----------|----------|
| S15 | Worker verifies Supabase JWT signature (HS256, `SUPABASE_JWT_SECRET`) before proxying | `workers/gateway/src/auth.ts` | ✅ |
| S16 | Origin allow-list enforced at edge (matches Cloudflare CORS policy) | `workers/gateway/src/proxy.ts` + `wrangler.toml` `CORS_ALLOWED_ORIGINS` | ✅ |
| S17 | Edge KV-backed per-IP rate limit (opt-in via `RATE_LIMIT_ENABLED`) | `workers/gateway/src/rate-limit.ts` | ✅ |
| S18 | Browser-issued data is never hard-rejected by Worker: 404 / 429 / 5xx fall through to `/api/*` (defense in depth) | `lib/gateway-read-client.ts` `fallbackToLocal` | ✅ |
| S19 | R2 access keys never reach the browser — uploads hit `/api/upload` on the Worker, which authorizes via `/api/files/authorize-upload`, then PUTs bytes to R2 | `workers/gateway/src/proxy.ts` + `lib/file-upload-client.ts` | ✅ |
| S20 | RLS still in force after gateway cutover — Worker enforces JWT, Supabase enforces row policy | `migrations/010_harden_rls_policies.sql` through `migrations/025b_master_plan_auth_rls_policies.sql` | ✅ |

**Security lead:** _________________ **Date:** __________
