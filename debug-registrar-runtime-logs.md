# Debug Session: registrar-runtime-logs [OPEN]

## Symptoms
- Browser console showed 4 logs around the registrar workspace:
  - `net::ERR_ABORTED` for `/?_rsc=...`
  - `net::ERR_ABORTED` for `/_next/static/webpack/...hot-update.json`
  - `TypeError: Cannot read properties of undefined (reading 'data')`
  - `net::ERR_ABORTED` for `/app/registrar?_rsc=...`

## Hypotheses
1. `AdminRoleWorkspace` crashes during Fast Refresh because `useWorkspaceContext()` briefly resolves to an undefined/stale value.
2. The `ERR_ABORTED` localhost requests are interrupted Next.js RSC/HMR fetches during reload/navigation, not Supabase failures.
3. The registrar dashboard links into admin-only pages, causing redirects and follow-on aborted RSC requests.
4. The global fetch guard wraps all browser fetches, so the stack includes `guardedFetch` even for non-Supabase localhost aborts.

## Evidence
- To be finalized from current code and browser/runtime behavior.

## Current status
- Investigating root causes and validating existing fixes.
