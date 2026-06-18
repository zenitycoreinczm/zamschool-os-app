# Operations

This document describes the day-two work: disaster recovery drills, load testing, and incident response. For the release sign-off, see [PRODUCTION.md](./PRODUCTION.md).

## Disaster recovery

You run a DR drill at least every 90 days. The drill restores a production snapshot to a non-production project and verifies:

- Schema matches the current migrations.
- RLS policies are intact.
- Auth flows (login, MFA, first-login) succeed against the restored data.
- A representative read flow (workspace dashboard) renders.
- A representative write flow (post an announcement) succeeds.

You record the drill date, duration, and result in the DR drill log under `docs/_archive/operations/dr-drill-log.md`. If a drill fails, the release is paused until the failure is root-caused.

The full runbook lives at `docs/_archive/operations/dr-drill-runbook.md`. You read it before scheduling a drill — it has changed since the last time you ran one.

## Load testing

You run load tests at four tiers. Each tier targets a realistic user mix.

- **smoke** — 10 virtual users, 1 minute. Used as a pre-merge sanity check.
- **tier1_100** — 100 users, 5 minutes. Used after every deploy to a non-production environment.
- **tier2_500** — 500 users, 10 minutes. Used before a release.
- **tier3_1000** — 1000 users, 15 minutes. Used quarterly and before a marketing-driven traffic spike.

You run them via `npm run load:test:<tier>`. The k6-style harness lives in `scripts/load-test/`. The current thresholds (p95 latency, error rate, gateway hit ratio) are recorded in `docs/_archive/operations/load-test-baseline.md`.

You should compare each run to the baseline and investigate any regression over 15%. A regression under 15% is recorded and watched; a regression over 30% blocks the release.

## Incident response

You follow the four-step pattern: detect, mitigate, communicate, recover.

1. **Detect.** Alerts fire on the thresholds in [PRODUCTION.md](./PRODUCTION.md#what-you-monitor). The on-call engineer acknowledges within five minutes.
2. **Mitigate.** The first move is almost always rollback. You do not debug in production while users are affected.
3. **Communicate.** You post to the incident channel within 15 minutes with: what's broken, what's affected, what's the mitigation, when the next update will land. You update every 30 minutes until resolved.
4. **Recover.** After mitigation, you restore the previous build, verify metrics return to baseline, and close the incident.

You log the incident in `docs/_archive/operations/incident-log.md`. The log entry includes: time of detection, time of mitigation, time of full recovery, root cause, customer impact, and follow-ups.

## On-call

The on-call rotation is weekly, Monday 09:00 to Monday 09:00 local time. You should not be on-call the week after a release you led. The handoff document is in the team wiki and includes current alerts, recent incidents, and any planned changes.

## What you do not do

You do not run destructive commands against production without a second pair of eyes. You do not bypass RLS to "fix" a query — fix the policy or fix the query. You do not roll forward to mitigate a regression — revert. You do not silence an alert without a follow-up issue to investigate it.
