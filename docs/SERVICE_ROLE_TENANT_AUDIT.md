# Service-role tenant isolation audit

**Generated:** 2026-06-14  
**Command:** `node scripts/security/audit-service-role-tenant.mjs`

This report lists `supabaseAdmin.from(...)` calls where a `school_id` (or documented exception) was **not** detected in the static scan window.

| Severity | Count |
|----------|-------|
| Fail | 0 |
| Review | 1 |

## Findings

| File | Line | Table | Level | Reason |
|------|------|-------|-------|--------|
| `app/api/staff/invitations/route.ts` | 233 | `staff_invitations` | review | staff_invitations without token/id filter |

## Exceptions (by design)

- **Global tables:** `schools`, `access_codes`, `auth.users`, `temp_tokens`
- **Token flows:** `staff_invitations` with `.eq('token')` or invitation id
- **Auth admin:** `supabaseAdmin.auth.*` (not scanned)

## Week 2 checklist

- [ ] Confirm each **review** row is safe or add `.eq('school_id', schoolId)`
- [ ] Re-run with `--strict` before production sign-off
