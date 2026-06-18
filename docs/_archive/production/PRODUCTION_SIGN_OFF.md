# Production sign-off (Week 8)

Master gate before general availability. All sections must be complete.

## 1. Automated gates

```bash
npm run production:sign-off
```

Runs: unit tests (via pilot preflight path), `audit:tenant:strict`, CDN preflight, load-test dry-run, doc presence checks.

## 2. Security

Complete every row in [SECURITY_SIGN_OFF_CHECKLIST.md](./SECURITY_SIGN_OFF_CHECKLIST.md).

## 3. Disaster recovery

Complete [DR_DRILL_RUNBOOK.md](./DR_DRILL_RUNBOOK.md) and record in [DR_DRILL_LOG.md](./DR_DRILL_LOG.md).

## 4. Performance

- [ ] `LOAD_TEST_RESULTS.md` shows tier1 within SLO (or documented exceptions)
- [ ] Supabase connection pooling configured for expected load

## 5. Pilot school

- [ ] [PILOT_READINESS_CHECKLIST.md](./pilot/PILOT_READINESS_CHECKLIST.md) signed
- [ ] No open P1/P2 incidents (or accepted risk documented)

## 6. Stakeholder approval

- [ ] [STAKEHOLDER_APPROVAL.md](./STAKEHOLDER_APPROVAL.md) signed by product, engineering, security, pilot school

## Program completion

When sections 1–6 are done, update [PRODUCTION_READINESS_PROGRAM.md](./PRODUCTION_READINESS_PROGRAM.md) dashboard to **Production readiness: Signed off**.

| Final score target | Value |
|--------------------|-------|
| Security posture | 8.5/10 |
| Production readiness | 8.5/10 |