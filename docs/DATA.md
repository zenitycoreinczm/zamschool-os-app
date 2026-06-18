# Data

This document describes the data layer: where state lives, how migrations are applied, and what you are allowed to change. For security boundaries on the data layer, see [SECURITY.md](./SECURITY.md).

## Storage

You are writing to one of four stores.

1. **Postgres (Supabase).** The system of record. Every domain entity lives here — profiles, classes, subjects, timetable, assignments, results, attendance, messages, fees, payments, announcements, events. RLS is on for every production table.
2. **Supabase Storage.** User uploads that need RLS — avatars, attachments. Bucket policies mirror the table RLS.
3. **Cloudflare R2.** Public-readable images (school logos, cached media) served via the edge worker.
4. **Edge cache (Cloudflare).** Read-through cache for workspace search, dashboard summary, attendance summary. Short TTLs.

## Migration policy

Migrations live under `supabase/migrations/` and are applied in lexical order. The apply order is documented in `docs/MIGRATION_APPLY_ORDER.md` (archived in `docs/_archive/data/`). You should:

- Never edit a migration after it has been applied to a non-local environment.
- Add a new migration for every schema change, including indexes and policy changes.
- Run `npm run schema:check` before committing and `npm run schema:check:strict` in CI.

## Tenant scoping

You must include `school_id` in every write that touches a school-scoped table. The shape of the row is `{ school_id, ...domain fields }`. The service role bypasses RLS, so every service-role write must filter on `school_id` explicitly. The strict tenant audit (`npm run audit:tenant:strict`) catches the ones you miss.

## Read paths

You have three read paths to choose from.

- **Local API route.** Default. Authenticated, RLS-enforced, slowest.
- **Gateway worker.** Public-readable, cached at the edge. Use for data the system can show to anonymous users (school name, public timetable).
- **Direct Supabase client.** Only from server components and only when you have already established the user's role. Never from a client component.

## Caching

You can cache at three layers. The defaults:

- **Edge cache.** Workspace search, dashboard summary, attendance summary. TTL 60s. Tag-based purge on writes.
- **Client cache.** `swr` or React state. No persistent cache by default.
- **Browser cache.** `Cache-Control: private, no-store` for any payload tied to a user's profile, children, or finances.

## Indexes

You should add an index when:

- A query filters or sorts on a column that is not the primary key.
- A join uses a foreign key on a hot path (e.g. `parent_students.parent_id`).
- A search query uses `to_tsvector` against a domain column.

You should not add an index for a query that runs once a day. The query planner will tell you if you need one.

## Backups

Database backups are managed by Supabase. Point-in-time recovery is enabled on the production project. You should not take ad-hoc backups — the cost is non-trivial and Supabase's PITR covers the same case.

## Files

User uploads go to Supabase Storage if they need RLS. Public images go to R2 via the gateway worker. The upload route at `app/api/files/route.ts` validates the entity type against `ALLOWED_ENTITY_TYPES` and uses `buildKey` to namespace by school. You should never accept a path from form data — always derive the key from the entity type and ID.
