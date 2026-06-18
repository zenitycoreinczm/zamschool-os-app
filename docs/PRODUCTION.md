# Production

This document describes what it takes to ship: the readiness gates, the sign-off process, and the rollback procedure. For day-to-day operations, see [OPERATIONS.md](./OPERATIONS.md). For findings, see [AUDIT.md](./AUDIT.md).

## Readiness gates

Before a release goes out, the following must be green. Each gate has an owner and a verification command.

1. **Build green.** `npm run build` succeeds. Owner: any developer.
2. **Lint green.** `npm run lint` reports zero errors. Owner: any developer.
3. **Tests green.** `npm test` and `npm run test:security` both pass. Owner: any developer.
4. **Schema green.** `npm run schema:check:strict` passes. Owner: the engineer who touched a migration.
5. **Tenant audit green.** `npm run audit:tenant:strict` passes. Owner: the engineer who touched a server file.
6. **Load test green.** The most recent `npm run load:test:tier2` run is below the thresholds in `OPERATIONS.md`. Owner: ops.
7. **DR drill green.** A successful drill in the last 90 days. Owner: ops.

## Sign-off

You record sign-off in the release thread. The sign-off template:

- Release version, target branch, commit SHA.
- Build, lint, tests, schema, tenant audit: green.
- Load test tier and result.
- DR drill date.
- Risks and mitigations.
- Rollback plan.

Two approvers are required: the engineer making the release and an independent reviewer who did not author the change. The reviewer runs the verification commands themselves before approving.

## Rollback

You should be able to roll back inside ten minutes. The mechanism:

- **Frontend.** Revert the offending commit on `main`. Re-deploy. The build is reproducible from `package.json` and `package-lock.json`.
- **Database.** Every migration is paired with a forward-only plan and a tested reverse plan in the PR description. If the reverse plan is not safe, the migration is held back.
- **Worker.** The gateway worker is versioned in `workers/gateway/wrangler.toml`. Roll back via Cloudflare's deployment history.
- **Cache.** Cloudflare cache rules purge on demand. You can also flip the origin to a previous build by changing the DNS target.

You should not roll forward to fix a regression. Revert, ship the revert, and re-investigate.

## What you ship

You ship:

- The Next.js standalone build (see `scripts/prepare-standalone.mjs`).
- The gateway worker (if it changed) via `wrangler deploy`.
- New migrations, applied in order against the production database.

You do not ship:

- Local `.env.local` files.
- `node_modules/` or build artifacts.
- Test fixtures or load-test scripts.

## What you monitor

You monitor at three levels:

- **Application.** Server-side error rate, p95 latency per role page, MFA enrollment success rate, login success rate.
- **Edge.** Gateway worker cache hit ratio, R2 4xx/5xx rate, Cloudflare cache purge latency.
- **Database.** Connection pool utilization, slow query log, RLS policy hits.

You should set alerts at thresholds, not on raw errors. A 0.1% error rate during deploy is fine; a 1% error rate at rest is not.

## After a release

You watch for 30 minutes. If the metrics stay green, you close the release thread. If they regress, you revert. The post-mortem, if any, goes into the team's incident log under `docs/_archive/operations/incident-log.md`.
