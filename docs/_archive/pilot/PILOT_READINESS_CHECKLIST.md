# Pilot readiness checklist

Complete before marking **Week 7 — school live**. Link evidence in the incident log or pilot profile.

## Platform (Weeks 1–6)

| # | Gate | Command / doc | Done |
|---|------|---------------|------|
| 1 | Security tests green | `node ./scripts/run-tests.mjs` | ⬜ |
| 2 | Tenant audit 0 fails | `npm run audit:tenant:strict` | ⬜ |
| 3 | CDN configured | `npm run cdn:preflight` | ⬜ |
| 4 | Auth rate limits fail-closed | [auth-api-rate-limit](../lib/auth-api-rate-limit.ts) | ⬜ |
| 5 | Load test smoke on staging | `npm run load:test:smoke` | ⬜ |
| 6 | Load test tier1 with JWT | `npm run load:test:tier1` | ⬜ |

## School provisioning

| # | Step | Done |
|---|------|------|
| 7 | Super-admin access code generated | ⬜ |
| 8 | Head teacher registered via `/register` + code | ⬜ |
| 9 | `initializeSchoolDefaults` ran (departments, permissions, settings) | ⬜ |
| 10 | Academic year + terms created | ⬜ |
| 11 | Classes + subjects seeded | ⬜ |
| 12 | Sample teacher/student/parent accounts created | ⬜ |

## Day-1 validation (each role)

| Role | Login | Critical path | Done |
|------|-------|---------------|------|
| Admin | `/login` | Dashboard, users, announcements | ⬜ |
| Teacher | `/login` | Bootstrap loads, attendance, assignments | ⬜ |
| Student | `/login` | Dashboard, timetable, results read | ⬜ |
| Parent | `/login` | Children linked, fees/attendance view | ⬜ |
| Bursar | `/login` | Payments shell, billing summary | ⬜ |

## Operations

| # | Item | Done |
|---|------|------|
| 13 | `GET /api/health` monitored | ⬜ |
| 14 | Incident log owner assigned | ⬜ |
| 15 | Support channel documented (WhatsApp / email) | ⬜ |
| 16 | Backup window confirmed with Supabase | ⬜ |

**Sign-off:** __________________ Date: __________