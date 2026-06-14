# Load test baseline matrix

Reference p95 targets for ZamSchool OS. **Measured values** live in [LOAD_TEST_RESULTS.md](./LOAD_TEST_RESULTS.md) after each run.

## Target p95 latency (ms)

| Scenario | Smoke | 100 users | 500 users | 1000 users |
|----------|-------|-----------|-----------|------------|
| `public_api` (/api/health) | ≤ 300 | ≤ 300 | ≤ 400 | ≤ 600 |
| `public_pages` | ≤ 800 | ≤ 800 | ≤ 1200 | ≤ 2000 |
| `account_read` | ≤ 1200 | ≤ 1200 | ≤ 1800 | ≤ 3000 |
| `teacher_bootstrap` | ≤ 2500 | ≤ 2500 | ≤ 3500 | ≤ 6000 |
| `admin_dashboard` | ≤ 2000 | ≤ 2000 | ≤ 3000 | ≤ 5000 |

Tier 2/3 budgets relax slightly under stress; formal SLOs in `lib/load-test-slo.ts` apply to **tier1** sign-off.

## Error rate ceilings

| Tier | Max error % (non-429) |
|------|------------------------|
| Smoke / 100 | 1% |
| 500 | 2% |
| 1000 | 5% (stress — document failures) |

## Infrastructure assumptions

- Next.js standalone on 1–2 instances (2 vCPU / 4 GB each)
- Supabase Pro pooler, `school_id` RLS enabled
- Redis for rate limits in staging/production
- `R2_PUBLIC_URL` set (avatars off app proxy)

## Recording a baseline

```bash
npm run load:test:smoke
# With staging URL + token:
set LOAD_TEST_BASE_URL=https://your-staging.vercel.app
set LOAD_TEST_BEARER_TOKEN=...
npm run load:test:tier1
```

Copy the results table from `LOAD_TEST_RESULTS.md` into your pilot runbook.