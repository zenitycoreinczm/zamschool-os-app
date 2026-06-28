# OPERATIONS

## Validation baseline
- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`

## Current known local issue
Windows builds may fail with a locked Sharp DLL inside `.next`. This is an environment file-lock issue, not a TypeScript correctness issue.

## Release checklist
- verify tenant-scoped guards on any new route
- verify migration safety and rollback plan
- verify audit coverage for privileged writes
- verify rate-limit coverage for new public or authenticated write paths
