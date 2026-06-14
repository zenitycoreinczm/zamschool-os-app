# Disaster recovery drill runbook

Execute **once before production sign-off** and **annually** thereafter. Record results in [DR_DRILL_LOG.md](./DR_DRILL_LOG.md).

## Targets

| Metric | Target | Actual (fill after drill) |
|--------|--------|---------------------------|
| **RPO** (max data loss) | 24 h (Supabase daily backup) | |
| **RTO** (restore to readable app) | 4 h | |
| **RTO** (full traffic cutover) | 8 h | |

Adjust if your Supabase plan offers PITR or more frequent backups.

## Drill A — Backup verification (60 min)

| Step | Action | Pass |
|------|--------|------|
| A1 | Supabase Dashboard → Database → Backups — confirm schedule enabled | ⬜ |
| A2 | Note latest backup timestamp | ⬜ |
| A3 | Document backup retention period | ⬜ |
| A4 | Export schema snapshot: `npm run schema:check` against prod ref | ⬜ |

## Drill B — Restore to staging (2–4 h)

| Step | Action | Pass |
|------|--------|------|
| B1 | Create **new** staging project OR restore branch (Supabase PITR if available) | ⬜ |
| B2 | Point staging `.env` at restored database | ⬜ |
| B3 | Run migrations if needed: `docs/MIGRATION_APPLY_ORDER.md` | ⬜ |
| B4 | `npm run pilot:preflight` against staging URL | ⬜ |
| B5 | Login smoke: admin + teacher on staging | ⬜ |
| B6 | Verify `school_id` isolation (spot-check two schools if multi-tenant data) | ⬜ |

## Drill C — Application recovery (30 min)

| Step | Action | Pass |
|------|--------|------|
| C1 | Redeploy last known good build from CI artifact / Vercel rollback | ⬜ |
| C2 | `GET /api/health` returns 200 | ⬜ |
| C3 | `npm run healthcheck` against production base URL | ⬜ |
| C4 | Confirm `R2_PUBLIC_URL` — avatars load from CDN | ⬜ |

## Drill D — Communication (15 min)

| Step | Action | Pass |
|------|--------|------|
| D1 | Incident commander role assigned | ⬜ |
| D2 | School contact tree documented in pilot profile | ⬜ |
| D3 | Status message template prepared (outage / recovery) | ⬜ |

## Failure criteria (drill does not pass)

- Restore cannot complete within RTO
- Auth broken after restore (sessions / profiles mismatch)
- Cross-tenant data visible in spot checks
- No backups in last 48 h

## Sign-off

| Role | Name | Date |
|------|------|------|
| Platform lead | | |
| DBA / Supabase owner | | |