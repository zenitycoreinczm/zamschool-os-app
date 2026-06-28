# CHANGELOG

All notable changes to ZamSchool OS are recorded here. The format is borrowed from Keep a Changelog; entries are grouped by date.

## 2026-06-28 — Head-teacher Settings fix
- Added a dedicated `app/app/principal/settings/page.tsx` that renders the head-teacher Settings page with `accent="indigo"`, matching the `PrincipalWorkspace` accent. The principal's Settings nav in `lib/workspace-nav.ts` now points at the new path instead of the admin-level fallback (which used `accent="emerald"`).
- Made `/api/account/session` log to the server console in non-prod on 500 so the underlying cause is recoverable from logs. The response shape now includes a `cause` field with that detail in non-prod; prod stays generic.
- `lib/account-portal-api.ts` and `components/account/AccountSettingsPage.tsx` now read `body.cause` before falling back to `body.error`, so a non-prod toast carries the real cause instead of the literal "Failed to load session".
- Pinned the load-bearing contracts with `__tests__/components/principal-settings.test.mjs` (4 assertions).

## 2026-06-28 — Quality pass
- Refreshed `docs/AUDIT.md` against current source; six prior "Needs Work" items confirmed resolved in the working tree and moved into a new "Resolved since 2026-06-21" subsection.
- Re-verified `MobileDock`, sidebar width source-of-truth, `prefers-reduced-motion` coverage, and inbox unread refresh model; promoted to `Done Well` where they held.
- Added shell a11y invariants test (`__tests__/components/shell-a11y.test.mjs`) so the resolved a11y shape cannot regress.
- Fixed `role="alert"` on the `TeacherShell` workspace error banner so it matches the other four role shells.
- Clarified the boundary between `WorkspaceContextProvider` and `TeacherWorkspaceProvider` in `docs/ARCHITECTURE.md` — the two providers carry different data shapes (`stats`, `workload`, `refresh()`) and a wholesale merge is not appropriate today.
- Documented the rationale for `suppressHydrationWarning` on `<body>` in `app/layout.tsx` (Next/font class hash).
- Shipped `scripts/audit-refresh.mjs` (wired as `npm run audit:refresh`) — re-reads each cited file from `docs/AUDIT.md` and asserts 11 invariants. Codified by `__tests__/lib/audit-refresh.test.mjs`.
- Documented the `lib/` subdomain policy in `docs/DEVELOPMENT.md` so new files land in subdomain folders instead of at the top level.
- Shipped the `lib/` subdomain guardrail (`eslint-rules/lib-subdomain-policy.mjs` + `eslint-rules/lib-legacy-whitelist.json`) and codified it with `__tests__/lib/lib-subdomain-policy.test.mjs`. The legacy allow-list contains every current top-level `lib/` file; new files at the top level emit a warning with the suggested subdomain.
- Moved the `lib/redis-*` cluster (6 files) into `lib/redis/` as the Phase 4 pilot. Import paths rewritten across `app/api/account/shell/route.ts`, `app/api/auth/send-otp/route.ts`, and 7 files under `lib/`. TypeScript clean; `npm test` green (55 test files).

## Unreleased
- Added canonical tenant helper module: `lib/tenant-context.ts`
- Standardized tenant-aware actor rate-limit key composition
- Added required architecture/security/operations documentation stubs
- Hardened staff invitation and admin user write rate limits with tenant scope
