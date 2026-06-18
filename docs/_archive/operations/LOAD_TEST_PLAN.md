# Load test plan (Week 6)

Validates ZamSchool OS API latency and stability at **100 / 500 / 1000** concurrent session levels before pilot sign-off.

## Tooling

| Tool | Command | When to use |
|------|---------|-------------|
| **Node runner** (built-in) | `npm run load:test:smoke` | Local/CI smoke; no k6 install |
| **k6** (optional) | `k6 run scripts/load-test/k6/smoke.js` | Teams with Grafana k6 |

## Prerequisites

1. App running (`npm run dev` or production `npm start`).
2. `LOAD_TEST_BASE_URL` — default `http://127.0.0.1:3000`.
3. **Authenticated scenarios:** export a valid session JWT:
   ```bash
   set LOAD_TEST_BEARER_TOKEN=<supabase-access-token>
   ```
   Obtain from browser DevTools → Application → cookies, or Supabase sign-in in staging.

4. Redis + Supabase staging should mirror production shape (pooled connections, RLS on).

## Tiers

| Tier | ID | Concurrency | Duration | Represents |
|------|-----|-------------|----------|------------|
| Smoke | `smoke` | 5 | 15s | CI / pre-flight |
| 100 users | `tier1_100` | 25 | 60s | Single school peak |
| 500 users | `tier2_500` | 100 | 120s | District burst |
| 1000 users | `tier3_1000` | 200 | 180s | Stress (find breaking point) |

Concurrency simulates active HTTP sessions; adjust if your hosting plan differs.

## Scenarios & SLO budgets (p95)

| Scenario | Endpoints | p95 budget | Notes |
|----------|-----------|--------------|-------|
| `public_pages` | `/login`, `/register` | 800 ms | SSR + middleware |
| `public_api` | `/api/health` | 300 ms | Liveness only |
| `account_read` | workspace-context, unread-summary | 1200 ms | Auth + Supabase |
| `teacher_bootstrap` | `/api/teacher/bootstrap` | 2500 ms | Heavy aggregate |
| `admin_dashboard` | dashboard/summary, attendance/summary | 2000 ms | Admin reads |

Full budgets: `lib/load-test-slo.ts`.

## Run commands

```bash
# Smoke (no auth required for public routes)
npm run load:test:smoke

# Full tiers (set bearer for auth routes)
set LOAD_TEST_BEARER_TOKEN=eyJ...
npm run load:test:tier1
npm run load:test:tier2
npm run load:test:tier3
```

Results append to **`docs/LOAD_TEST_RESULTS.md`** with per-scenario p50/p95/p99 and pass/fail vs SLO.

## Pass criteria (Week 6 exit)

- [ ] Smoke tier passes on staging
- [ ] Tier 1 (100) passes all scenarios with bearer token
- [ ] Tier 2 documented (pass or known gaps with remediation owner)
- [ ] Tier 3 run once; document Supabase pool / rate-limit ceilings
- [ ] `docs/LOAD_TEST_RESULTS.md` committed or attached to pilot checklist

## Failure triage

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| p95 spike on `teacher_bootstrap` | N+1 queries | Profile SQL; add caching |
| 429 on auth routes | Rate limits | Expected under stress; note in results |
| 401 on account/teacher | Missing bearer | Set `LOAD_TEST_BEARER_TOKEN` |
| 503 / timeouts | Connection pool | Reduce concurrency; upgrade Supabase compute |
| High `public_pages` | Cold start | Warm instances; CDN static assets |

## Optional k6

```bash
k6 run -e BASE_URL=https://staging.example.com scripts/load-test/k6/smoke.js
```

## Related

- [LOAD_TEST_BASELINE.md](./LOAD_TEST_BASELINE.md) — target matrix reference
- [PRODUCTION_READINESS_PROGRAM.md](./PRODUCTION_READINESS_PROGRAM.md)