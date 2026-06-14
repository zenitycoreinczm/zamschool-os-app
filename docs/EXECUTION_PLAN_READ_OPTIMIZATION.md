# Execution Plan — Read-Heavy Optimization (Staff UI)

**Goal:** Align ZamSchool OS with *write once, read many* — one small workspace context per session, not Supabase on every navigation.

**Started:** 2026-06-02

---

## Phase 1 — Workspace context API (this pass)

| Step | Task | Owner | Status |
|------|------|-------|--------|
| 1.1 | `GET /api/account/workspace-context` — profile + school + year/term + unread | Agent | Done |
| 1.2 | `lib/workspace-context-client.ts` — 60s client cache + invalidate | Agent | Done |
| 1.3 | `WorkspaceContextProvider` in `app/app/layout.tsx` | Agent | Done |
| 1.4 | Refactor `RoleBasedShell` — read role from context | Agent | Done |
| 1.5 | Refactor `AdminShell` — remove `pathname` from profile load; route guards separate | Agent | Done |
| 1.6 | `GET /api/payments/shell-summary` + refactor `PaymentsShell` | Agent | Done |
| 1.7 | Smoke: navigate `/app/*` without repeated Supabase from browser | Agent | Pending |

**Success criteria:** Admin navigation does not call `supabase.from` for profile/school/year/term; ≤1 workspace-context call per 60s per tab.

---

## Phase 2 — Dashboard read models (done)

| Step | Task | Status |
|------|------|--------|
| 2.1 | `GET /api/dashboard/summary` + `academic-scope`; refactor `dashboard-client` | Done |
| 2.2 | `DashboardSummaryProvider` + `UserCard` / `CountChart` — no client Supabase | Done |
| 2.3 | Published results — server cache + invalidate on publish | Done |
| 2.4 | Announcements — shared loader, Redis cache, invalidate on write | Done |
| 2.5 | `announcements-client` — 60s client cache; endpoint keyed by role path | Done |

---

## Phase 3 — Publish pipeline & CDN (next)

| Step | Task |
|------|------|
| 3.1 | Enable R2 `R2_PUBLIC_URL` (dashboard) + migrate legacy avatar URLs |
| 3.2 | Optional: Cloudflare Worker for hot GET routes |

---

## Phase 4 — Cleanup & E2E (next)

| Step | Task |
|------|------|
| 4.1 | Remove dead API dirs (`admin/access*`) |
| 4.2 | Consolidate `supabaseAdmin` imports |
| 4.3 | Role-based smoke tests (login → navigate → avatar → dashboard)

---

## Principles (check every PR)

1. **Browsers do not query Supabase for shell chrome** — use API routes.
2. **Navigation ≠ refetch** — refetch on mount, focus (unread only), or explicit `refresh()`.
3. **Bundle small summaries** — detail endpoints on tap.
4. **Cache with TTL** — private `max-age=30` on server; 60s client for workspace context.