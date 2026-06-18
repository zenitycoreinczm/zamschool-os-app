# Architecture

This document describes how ZamSchool OS is put together at the system level: the stack, the major subsystems, the data flow, and the entry points. For shell patterns and design tokens, see [UI-UX.md](./UI-UX.md). For findings, see [AUDIT.md](./AUDIT.md).

## Stack

You are looking at a Next.js 16 application using the App Router, Tailwind 4 for styling, and Supabase for auth, database, and storage. The runtime is Node.js for the Next.js server plus a Cloudflare Worker for the edge gateway (see `workers/gateway/`). The database is Postgres via Supabase with row-level security on every production table.

The package scripts you should know are in `package.json`:

- `dev`, `build`, `start` — Next.js lifecycle.
- `test`, `test:security` — the static-grep test runner and the security-focused subset.
- `lint` — ESLint across the repo.
- `schema:check`, `schema:check:strict` — verify Supabase migrations match the running schema.
- `audit:tenant`, `audit:tenant:strict` — verify no service-role query bypasses tenant scoping.
- `load:test:*` — k6-style load tests at four tiers.
- `cloudflare:*`, `cdn:*` — edge cache and R2 image routing.

## Layers

You can think of the app as four layers stacked on each other.

1. **Routes.** Everything under `app/app/*` is the authenticated workspace. `app/page.tsx` is the public landing. `app/login/*`, `app/first-login/*`, and `app/error.tsx` handle the unauthenticated edges. The role shells live at `app/app/{admin,teacher,parent,student,principal,payments}/page.tsx` and a payments subroute.
2. **Shells.** `components/RoleBasedShell.tsx` dynamic-imports the right shell per role (`AdminShell`, `TeacherShell`, `ParentShell`, `StudentShell`, `PaymentsShell`). See [UI-UX.md](./UI-UX.md#shell-patterns) for the two layout families.
3. **Components.** Sidebar, header, dock, modals, and feature widgets. Side components co-locate with their owning shell.
4. **Lib.** Pure helpers under `lib/`: `admin-route-client.ts`, `gateway-read-client.ts`, `workspace-nav.ts`, `workspace-search.ts`, plus auth and rate-limit helpers.

## Data flow

You read data through the gateway worker when possible. `lib/gateway-read-client.ts` exports `fetchGatewayRead`, which talks to the worker endpoint with the user's bearer token. If the worker is unreachable, the client falls back to the local API route (`fallbackToLocal`). Mutations always go through the local API routes under `app/api/*`, which use `requireActorContext` or role-scoped guards.

Reads the system caches today:

- Workspace search index — precomputed and rebuilt on profile change.
- Dashboard summary — short TTL, served from `CountChart` and friends.
- Admin attendance summary — short TTL, served from `AttendanceChart`.
- Per-role workspace page items — precomputed from `roleNavSections`.

## Roles and routes

You should treat roles as the unit of authorization. The list lives in `lib/workspace-nav.ts` (`roleNavSections`) and is consumed by every shell. The roles in active use are admin, principal, teacher, parent, student, payments (bursar), plus several admin subtypes (`super_admin`, `guidance_office`, `discipline_admin`, `it_admin`, `auditor`). Unknown roles fall back to `AdminShell`. The redirect rules between role paths live in `AdminShell.tsx` (`resolveWorkspaceRedirect`).

## Auth

Supabase handles auth. MFA enrollment, challenge, verify, and factor management are exposed under `app/api/auth/mfa/route.ts` and tested in `__tests__/app/api/auth/mfa/route.test.mjs`. Rate limiting is fail-closed on every MFA route. The `first-login` page forces a password change before the workspace becomes reachable. The `login` page handles session switching and a cooldown state that disables the submit button when active.

For the threat model, RLS policy, service-role audit, MFA setup, and rate-limit configuration, see [SECURITY.md](./SECURITY.md).

## What runs where

- **Next.js server (`next start`)** — page rendering, API routes, middleware, server actions.
- **Edge worker (`workers/gateway/`)** — public reads, image cache, R2 routing, fail-open cache headers.
- **Supabase** — Postgres, auth, RLS policies, storage buckets, real-time channels (used sparingly).
- **Cloudflare** — DNS, cache rules, R2 backing store, image transformations.

You should not put business logic in the worker. It is a read cache with edge headers, not an API surface.
