# ZamSchool OS — Supabase Protection & Optimization Strategy

This document is the team playbook for keeping Supabase (PostgreSQL) fast, secure, and within free/low-cost tiers. **Implementation lives in code** — see the map at the end.

## Golden rule

**Default to caching.** If a read is frequent and data changes infrequently, it should not hit Supabase on every request.

## Layered architecture

```
User request
    ↓
Cloudflare (CDN, rate limiting, WAF, edge cache on safe GETs)
    ↓
Next.js (API routes, Cache-Control via middleware)
    ↓
Hot-read cache (in-memory, short TTL — badges, workspace shell)
    ↓
Enhanced cache (in-memory, 1–10 min — announcements, dashboards, profiles)
    ↓
Redis (approved keys only — rate limits, role snapshot, session meta, OTP/temp tokens)
    ↓
Supabase (source of truth, RLS, critical writes, auth)
```

## What Supabase excels at (use it here)

| Strength | Use in ZamSchool |
|----------|------------------|
| Row Level Security | All exposed tables |
| Relational queries | Students ↔ classes ↔ results |
| ACID writes | Attendance, results, payments, provisioning |
| Auth + policies | Login, JWT, `profiles.role` |
| Realtime | Only when truly needed (avoid by default) |

## What must NOT hit Supabase directly (without a cache layer)

| # | Operation | Protection layer | Implementation |
|---|-----------|------------------|----------------|
| 1 | Repeated role/permission checks | Redis + middleware memory | `lib/redis-role-cache.ts`, `lib/middleware-profile-cache.ts` |
| 2 | Rate limit counters | Redis / KV / memory | `lib/server-guards.ts`, `lib/kv-client.ts` |
| 3 | Session metadata | Redis (not JWT replacement) | `lib/redis-session.ts` |
| 4 | OTP / temp tokens | Redis | `lib/redis-temp.ts` |
| 5 | Public / semi-static reads | Cloudflare + Next.js | `lib/edge-cache.ts` |
| 6 | Dashboard / shell reads | Enhanced cache + hot-read | `lib/dashboard-summary-server.ts`, `lib/workspace-context-server.ts` |
| 7 | Heavy reporting | Materialized views (phase 2) + cache | Planned |
| 8 | Static / marketing | Cloudflare edge | Page cache policy in `middleware.ts` |
| 9 | Files / images | R2 + CDN | `lib/r2-client.ts` |
| 10 | Duplicate reads in one flow | `withCache` / hot-read | `lib/enhanced-cache.ts`, `lib/hot-read-cache.ts` |

## Critical writes (always Supabase)

- Authentication (login, refresh, first-login)
- Attendance, results, payments
- User provisioning (students, teachers, parents)
- Profile updates, message send, notification create
- Staff invitations

## TTL defaults (code)

Defined in `lib/supabase-protection.ts`:

| Cache | TTL |
|-------|-----|
| Middleware role | 5 minutes |
| Redis actor snapshot (role + schoolId) | 15 minutes |
| Unread badge counts (hot-read) | 20 seconds |
| Workspace stable shell | 45 seconds |
| Auth admin metadata (`email_confirmed`) | 2 minutes |
| Non-sensitive profile columns | 5 minutes (+ SWR) |
| Announcements per school | 60 seconds (+ SWR) |
| Admin dashboard summary | 5 minutes (+ SWR) |

Unread caches are **invalidated** when messages/notifications are marked read (`lib/inbox-read-cache.ts`).

## Redis free tier (~30MB)

**Approved prefixes** (`lib/redis-keys.ts`): `rl:`, `role:`, `sess:`, `tmp:`, `daily:`

**Not stored in Redis:** full dashboards, student lists, attendance rows, exam payloads — use in-memory `enhanced-cache` or Supabase with indexes.

Configure Redis Cloud: `maxmemory ~25mb`, policy `allkeys-lru`. App always sets `EX` on writes.

## Cloudflare checklist

1. **Rate limit** `POST /api/auth/*` and `/login` (~10 req/min per IP).
2. **Cache** safe GETs that send `Cache-Control` with `Vary: Authorization` (workspace context, school settings).
3. **Bypass cache** for `/api/account/unread-summary`, `/api/account/inbox-preview`, mutations.
4. Serve static assets and R2 public URLs from edge.

## Route classification

`classifyApiRoute()` in `lib/supabase-protection.ts` labels API paths as `critical_write`, `auth`, `volatile_read`, `cacheable_read`, or `static` for reviews and logging.

## Feature matrix (quick reference)

| Feature | Hit Supabase? | Strategy |
|---------|---------------|----------|
| Login / auth | Yes (controlled) | CF rate limit + Redis session meta |
| Permission checks | Rarely | Redis role snapshot |
| Workspace shell | Selectively | Hot-read + edge 45s |
| Unread badges | Debounced | 20s hot-read, invalidate on read |
| Result / attendance write | Yes | RLS + direct write |
| Announcements list | Rarely | `loadSchoolAnnouncements` cache |
| Reports | Phase 2 | Materialized views + cache |
| File upload | No (R2) | Rate limit via Redis/memory |

## Phase 2 (not yet in app)

- Materialized views for admin analytics (`school_dashboard_stats`)
- Optional Redis `snap:` keys for cross-instance badge consistency (multi-node deploys)
- Query observability: log Supabase round-trips per route in development

## Code map

| Module | Purpose |
|--------|---------|
| `lib/supabase-protection.ts` | Policy constants + route classification |
| `lib/hot-read-cache.ts` | Short TTL in-process debounce |
| `lib/inbox-read-cache.ts` | Unread message + notification counts |
| `lib/workspace-context-server.ts` | Workspace shell payload builder |
| `lib/edge-cache.ts` | Cache-Control presets + middleware |
| `lib/enhanced-cache.ts` | Stale-while-revalidate (process memory) |
| `lib/redis.ts` | Approved Redis operations |
| `lib/invalidate-actor-caches.ts` | Clear all identity caches on profile change |

## Team habits

1. **Measure** — count Supabase calls per page load before adding features.
2. **Invalidate** — after writes that affect badges or shell, call `invalidateInboxHotReads` or `invalidateActorCaches`.
3. **Never** put service role keys in client bundles.
4. **Never** trust `user_metadata` for authorization — use `profiles.role` only.
5. **Prefer** read-optimized views and indexes in Supabase before adding more app caches.