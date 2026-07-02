# Debug Session: registrar-workspace-logs [OPEN]

## Symptoms
- Browser console showed 4 logs around the registrar workspace at `/app/registrar`:
  - `net::ERR_ABORTED` for `/?_rsc=...`
  - `net::ERR_ABORTED` for `/_next/static/webpack/...hot-update.json`
  - `TypeError: Cannot read properties of undefined (reading 'data')`
  - `net::ERR_ABORTED` for `/app/registrar?_rsc=...`
- User reports "3 logs" are still being emitted

## Hypotheses
1. **H1**: `AdminRoleWorkspace` crashes during Fast Refresh because `useWorkspaceContext()` briefly resolves to an undefined/stale value. The `workspaceCtx?.data` chain in `AdminRoleWorkspace.tsx:679` is already guarded, but downstream consumers may not be.
2. **H2**: `useWorkspaceSummary()` returns an undefined object during the first render (loading=true), and `AdminRoleWorkspace.tsx:680` does `useWorkspaceSummary() ?? undefined` then destructures `summary?.metrics` — but if the hook itself returns undefined briefly, this should be safe. However, `WorkspaceContextProvider` is wrapped via `useContext` and could return undefined under HMR unmount.
3. **H3**: The registrar page renders `AdminRoleWorkspace` which uses `useWorkspaceContext()`. The parent provider is in `app/app/layout.tsx`, but the AdminShell or downstream child might call `useContext` outside the provider tree during HMR remounts.
4. **H4**: Stale module cache from prior session — `lib\workspace\nav.ts` test failed with `C:\Zamschool-main\lib\lib\workspace\nav.ts` showing a bad path. This is unrelated to runtime, but the test was failing earlier.
5. **H5**: The `ERR_ABORTED` RSC requests are HMR aborts, not crashes — these are normal during Fast Refresh and should be ignored. The real bug is the `TypeError`.

## Evidence
- To be collected from current code and runtime behavior.

## Current status
- Investigating root causes and validating existing fixes.
- The summary API now handles REGISTRAR role with appropriate metrics/highlights.
