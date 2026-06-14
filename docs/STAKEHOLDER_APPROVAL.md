# Stakeholder production approval

Formal sign-off to operate ZamSchool OS in production beyond the pilot school.

## Release summary

| Item | Value |
|------|-------|
| **Product** | ZamSchool OS |
| **Version / build** | |
| **Production URL** | |
| **Pilot school** | See [pilot/SCHOOL_PROFILE.md](./pilot/SCHOOL_PROFILE.md) |
| **Program completion** | 8-week production readiness (2026-06-03) |

## Evidence pack

| Document | Status |
|----------|--------|
| [PRODUCTION_READINESS_PROGRAM.md](./PRODUCTION_READINESS_PROGRAM.md) | ⬜ Reviewed |
| [SECURITY_SIGN_OFF_CHECKLIST.md](./SECURITY_SIGN_OFF_CHECKLIST.md) | ⬜ Complete |
| [DR_DRILL_LOG.md](./DR_DRILL_LOG.md) | ⬜ Drill passed |
| [LOAD_TEST_RESULTS.md](./LOAD_TEST_RESULTS.md) | ⬜ Tier1 acceptable |
| [pilot/PILOT_READINESS_CHECKLIST.md](./pilot/PILOT_READINESS_CHECKLIST.md) | ⬜ Complete |
| [pilot/INCIDENT_LOG.md](./pilot/INCIDENT_LOG.md) | ⬜ Process active |
| CI last green build | ⬜ Link: |

## Approvals

| Stakeholder | Role | Decision | Signature | Date |
|-------------|------|----------|-----------|------|
| | Product owner | Approve / Defer | | |
| | Engineering lead | Approve / Defer | | |
| | Security | Approve / Defer | | |
| | Pilot school head teacher | Approve / Defer | | |
| | Operations | Approve / Defer | | |

## Deferral conditions

Production launch is **blocked** if any of the following are open:

- Open **P1** incident in pilot log
- `audit:tenant:strict` failures
- DR drill not completed in last 12 months
- No `R2_PUBLIC_URL` in production environment

## Post-approval

- [ ] Enable production monitoring (uptime + `/api/health`)
- [ ] Schedule quarterly DR drill
- [ ] Review [INCIDENT_LOG](./pilot/INCIDENT_LOG.md) weekly for first month