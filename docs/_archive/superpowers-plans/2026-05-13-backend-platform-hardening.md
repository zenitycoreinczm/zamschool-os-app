# Backend Platform Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden ZamSchool OS backend platform boundaries across Supabase, Redis, and Cloudflare so uploads, secrets, rate limits, and tenant isolation are production-ready.

**Architecture:** Supabase remains the source of truth for auth, tenant data, roles, RLS, and audit data. Redis is the authoritative backend for strict counters, login/OTP cooldowns, short-lived cache, and distributed locks. Cloudflare handles edge protection, R2 file storage, Images delivery, and an optional Worker upload gateway that delegates authorization decisions back to the Next.js backend.

**Tech Stack:** Next.js App Router, Supabase Auth/Postgres, Redis Cloud via `ioredis`, Cloudflare Workers, Cloudflare R2, Node test runner.

---

## File Structure

- `app/api/files/authorize-upload/route.ts`: New server authorization endpoint for Worker uploads. It validates the Supabase actor, file metadata, upload entity type, and returns a server-generated R2 key.
- `app/api/files/authorize-upload/route.test.mjs`: Regression tests for method surface and route invariants.
- `workers/gateway/src/index.ts`: Harden CORS, call the authorization endpoint, stop trusting client paths, preserve tenant-scoped keys, and serve only authorized/safe object names.
- `workers/gateway/src/index.test.mjs`: Worker behavior tests using fake R2 buckets and a fake upstream authorization server.
- `lib/redis.ts`: Normalize Redis Cloud TLS behavior, avoid serverless offline queues, use bounded `SCAN` cleanup, and release locks atomically.
- `lib/redis.test.mjs`: Tests for Redis URL option derivation and cache key safety helpers.
- `lib/rate-limit.ts`: Prefer Redis for strict limits, use KV only when Redis is unavailable, and keep fail behavior explicit.
- `cloudflare-integration/env-variables.md`: Replace literal secrets with placeholders and rotation instructions.
- `cloudflare-integration/01-r2-client-setup.md`: Replace literal R2 credentials with placeholders.
- `scripts/test_login.mjs`: Remove hardcoded Supabase URL/key and read from environment.

## Task 1: Remove Committed Secret Literals

- [x] **Step 1: Write a secret hygiene regression check**

Create a test that reads docs/scripts and asserts known literal R2/Supabase credentials are absent.

Run: `node --experimental-strip-types --test security-remediation.test.mjs`

- [x] **Step 2: Replace literal secret values with placeholders**

Edit Cloudflare docs and login test scripts so only placeholders or environment variables remain.

- [x] **Step 3: Re-run the focused security test**

Run: `node --experimental-strip-types --test security-remediation.test.mjs`

## Task 2: Harden Worker Upload Authorization

- [x] **Step 1: Write failing Worker tests**

Cover these behaviors:
- disallowed origins do not get CORS approval
- missing `Authorization` is rejected
- upstream authorization failure is rejected
- client-supplied `path` is ignored
- successful uploads use the upstream-issued key

Run: `node --experimental-strip-types --test workers/gateway/src/index.test.mjs`

- [x] **Step 2: Add the Next.js upload authorization endpoint**

The endpoint accepts `filename`, `contentType`, `size`, and `entityType`, validates the current actor with `requireActorContext`, validates file metadata with `validateFileUpload`, and returns `{ key, bucket, publicUrl? }`.

- [x] **Step 3: Update the Worker**

The Worker calls `${UPSTREAM_API}/api/files/authorize-upload`, forwards the bearer token, and writes to R2 using only the returned key and bucket.

- [x] **Step 4: Re-run Worker and route tests**

Run: `node --experimental-strip-types --test workers/gateway/src/index.test.mjs app/api/files/authorize-upload/route.test.mjs`

## Task 3: Make Redis the Strict Coordination Layer

- [x] **Step 1: Write failing Redis helper tests**

Cover Redis Cloud TLS option derivation, bounded scan pattern cleanup, and Lua-based lock release.

Run: `node --experimental-strip-types --test lib/redis.test.mjs`

- [x] **Step 2: Update Redis client options and helpers**

Set TLS automatically for `*.db.redis.io`, disable offline queues for serverless safety, replace `KEYS` with `SCAN`, and release locks with a compare-and-delete Lua script.

- [x] **Step 3: Re-run Redis helper tests**

Run: `node --experimental-strip-types --test lib/redis.test.mjs`

## Task 4: Align Rate Limiting Provider Priority

- [x] **Step 1: Write failing rate-limit source test**

Assert Redis is attempted before KV for strict API rate limits.

Run: `node --experimental-strip-types --test lib/rate-limit.test.mjs`

- [x] **Step 2: Update provider order**

Use Redis when configured, fall back to KV when Redis is missing, then fail closed or explicit fail-open depending on the route helper.

- [x] **Step 3: Re-run rate-limit tests**

Run: `node --experimental-strip-types --test lib/rate-limit.test.mjs`

## Task 5: Verify

- [x] **Step 1: Run focused tests**

Run: `node --experimental-strip-types --test workers/gateway/src/index.test.mjs app/api/files/authorize-upload/route.test.mjs lib/redis.test.mjs lib/rate-limit.test.mjs security-remediation.test.mjs`

- [x] **Step 2: Run project tests**

Run: `npm test`

- [x] **Step 3: Run lint**

Run: `npm run lint`

## Task 6: Reconcile Supabase Schema Contract

- [x] **Step 1: Make schema drift reporting accurate**

Update `scripts/schema-check.mjs` so it validates `schema.sql` plus numbered migrations, excludes aggregate SQL editor files from migration ordering, and reports duplicate migration numbers separately.

Run: `npm run schema:check`

- [x] **Step 2: Add canonical role tables or adapters for `students` and `teachers`**

Decide whether production should keep physical `students` / `teachers` tables, replace them with views over `profiles`, or migrate all route code to profile-only role records. Because current APIs still query `students` and `teachers` directly, production readiness needs a migration-backed contract for both names.

- [x] **Step 3: Add strict schema verification to CI**

After the `students` / `teachers` contract is resolved, run `npm run schema:check -- --strict` in CI/build verification so missing backend tables stop deployments.

- [ ] **Step 4: Verify live Supabase project alignment**

Run live inspection with service-role credentials, compare table existence/RLS/indexes against migrations, and document any live-only drift before changing production data.

Live inspection now fails closed when drift is detected. On 2026-05-14 it reported `teachers.employee_id` missing in the configured Supabase project. The migration file `migrations/020_add_student_teacher_role_tables.sql` is ready, but automated application was blocked because `exec_sql` is not installed in the project, Supabase CLI is not installed, Supabase management API credentials are not configured, the direct `DATABASE_URL` host resolves only to IPv6 from this machine, and tested Supabase pooler endpoints timed out from this environment.

## Verification Snapshot: 2026-05-13

- `npm test`: 306/306 passing.
- `npm run lint`: passing with no warnings.
- `npx tsc --noEmit`: passing.
- `npm run build`: passing; local SMTP variables are not configured, so live email delivery still requires environment setup.
- `npm run schema:check`: intentionally not green yet; now accurately reports missing `students` and `teachers` migration contract only.

## Self-Review

- Spec coverage: The plan covers secret hygiene, Cloudflare Worker upload security, Redis strict coordination, rate-limit provider choice, and verification.
- Placeholder scan: No implementation step uses vague placeholders; credential examples are intentionally placeholders.
- Type consistency: Worker uses `Env`, R2 bucket bindings, and upstream authorization JSON consistently with the proposed Next.js endpoint.
