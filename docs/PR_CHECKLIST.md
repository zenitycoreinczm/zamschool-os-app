# Pull Request Checklist

## Pre-Submit

- [ ] Code builds without errors (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] All tests pass (`npm run test:all`)
- [ ] Security tests pass (`npm run test:security`)
- [ ] Schema check passes (`npm run schema:check`)
- [ ] Tenant isolation audit passes if DB changes (`npm run audit:tenant`)

## Code Quality

- [ ] No dead code or unused imports
- [ ] No obvious comments explaining what the code does
- [ ] No unnecessary abstractions - prefer straightforward implementation
- [ ] Input validation with Zod schemas for all new API routes
- [ ] Error messages are sanitized before returning to clients
- [ ] Rate limiting considered for new API routes
- [ ] RLS-compliant queries using service role where needed

## Database Changes

- [ ] Migration file created in `/migrations` with sequential number
- [ ] Migration order updated in `MIGRATION_APPLY_ORDER.md`
- [ ] RLS policies included for new tables
- [ ] Indexes added for query performance
- [ ] Up/down migration tested
- [ ] No breaking changes to existing schema without migration path

## API Routes

- [ ] Route file in correct directory under `/app/api/`
- [ ] HTTP methods explicitly exported (GET, POST, PUT, DELETE, PATCH)
- [ ] Proper error handling with try/catch
- [ ] Rate limiting middleware applied
- [ ] CORS headers handled by middleware

## Frontend

- [ ] Mobile-first responsive design
- [ ] Loading states present
- [ ] Error states present
- [ ] Empty states present
- [ ] Role-based access considered
- [ ] Works with intermittent connectivity (offline-friendly)

## Security

- [ ] No hardcoded secrets or keys
- [ ] RLS policies tested for all user roles
- [ ] Input validated and sanitized
- [ ] No SQL injection vectors
- [ ] Audit logging for critical actions