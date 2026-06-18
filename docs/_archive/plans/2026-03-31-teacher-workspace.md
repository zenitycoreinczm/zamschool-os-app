# Teacher Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the teacher account type into a tighter, faster workspace with teacher-owned profile and settings pages, new teaching and inbox hub routes, and shared teacher-only workspace state.

**Architecture:** Keep the existing `/teacher/*` detail routes, but introduce a teacher-owned workspace layer that provides shared account and summary state to the teacher shell and primary teacher pages. Replace the generic role-based path for teacher pages with a teacher-specific route group design so navigation, copy, and loading stay consistent while heavier page data remains local to each detail route.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Tailwind CSS, Supabase client auth, existing node:test regression files

---

### Task 1: Lock the current teacher route and shell baseline with failing tests

**Files:**
- Create: `webapp/app/(dashboard)/teacher/teaching/page.test.mjs`
- Create: `webapp/app/(dashboard)/teacher/inbox/page.test.mjs`
- Create: `webapp/app/(dashboard)/teacher/profile/page.test.mjs`
- Create: `webapp/app/(dashboard)/teacher/settings/page.test.mjs`
- Modify: `webapp/components/teacher-shell.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:
- the teacher shell primary nav contains `/teacher`, `/teacher/teaching`, `/teacher/inbox`, `/teacher/profile`, and `/teacher/settings`
- the teacher shell no longer exposes the current flat top-level list for every detail page
- `/teacher/profile` does not proxy `@/app/app/profile/page`
- `/teacher/settings` does not proxy `@/app/app/settings/page`
- the new `teaching` and `inbox` pages contain teacher-specific section labels

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test components/teacher-shell.test.mjs app/(dashboard)/teacher/profile/page.test.mjs app/(dashboard)/teacher/settings/page.test.mjs app/(dashboard)/teacher/teaching/page.test.mjs app/(dashboard)/teacher/inbox/page.test.mjs
```

Expected:
- FAIL because the new pages do not exist yet
- FAIL because profile and settings still proxy the generic `/app` pages
- FAIL because the teacher shell still contains the current flat navigation

**Step 3: Write minimal implementation**

Do not optimize yet. Create the empty route files and adjust the shell nav only enough to satisfy the route-structure assertions.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for route existence and shell structure assertions

**Step 5: Commit**

```bash
git add webapp/components/teacher-shell.test.mjs webapp/app/(dashboard)/teacher/teaching/page.test.mjs webapp/app/(dashboard)/teacher/inbox/page.test.mjs webapp/app/(dashboard)/teacher/profile/page.test.mjs webapp/app/(dashboard)/teacher/settings/page.test.mjs
git commit -m "test: lock tighter teacher workspace routes"
```

### Task 2: Introduce shared teacher workspace state

**Files:**
- Create: `webapp/components/TeacherWorkspaceProvider.tsx`
- Create: `webapp/components/teacher-workspace-provider.test.mjs`
- Modify: `webapp/components/TeacherShell.tsx`
- Modify: `webapp/app/(dashboard)/layout.tsx`
- Modify: `webapp/app/(dashboard)/teacher/page.tsx`
- Modify: `webapp/lib/account-profile-client.ts`

**Step 1: Write the failing test**

Add assertions that:
- the provider exposes one shared teacher account fetch path
- the teacher shell consumes provider state rather than calling `supabase.auth.getUser()`
- teacher dashboard code can consume workspace account data without re-requesting the same identity payload on mount

Use a simple source-level regression if needed, for example matching:
- `TeacherWorkspaceProvider`
- provider exports or hook names
- absence of `supabase.auth.getUser()` inside `TeacherShell.tsx`

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test components/teacher-workspace-provider.test.mjs components/teacher-shell.test.mjs app/(dashboard)/teacher/page.test.mjs
```

Expected:
- FAIL because the provider does not exist
- FAIL because `TeacherShell.tsx` still performs direct auth lookups

**Step 3: Write minimal implementation**

Implement a teacher-only workspace provider that:
- loads the account profile once
- computes or loads teacher summary counts needed by the shell
- exposes loading, error, account, and refresh state

Refactor the teacher shell to:
- use provider state
- remove direct `supabase.auth.getUser()` and profile-role lookup
- keep only UI behavior and navigation concerns

Refactor dashboard account loading to:
- consume shared workspace data first
- fetch only page-specific heavier data

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for provider and shell ownership assertions

**Step 5: Commit**

```bash
git add webapp/components/TeacherWorkspaceProvider.tsx webapp/components/teacher-workspace-provider.test.mjs webapp/components/TeacherShell.tsx webapp/app/(dashboard)/layout.tsx webapp/app/(dashboard)/teacher/page.tsx webapp/lib/account-profile-client.ts
git commit -m "feat: add shared teacher workspace state"
```

### Task 3: Build the teacher teaching hub

**Files:**
- Create: `webapp/app/(dashboard)/teacher/teaching/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/classes/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/attendance/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/assignments/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/results/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/teaching/page.test.mjs`

**Step 1: Write the failing test**

Add assertions that the teaching hub includes:
- teacher-specific heading text
- sections for classes, attendance, assignments, and results
- links to `/teacher/classes`, `/teacher/attendance`, `/teacher/assignments`, and `/teacher/results`

Add assertions to detail pages for consistent back-links or CTA references to `/teacher/teaching`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test app/(dashboard)/teacher/teaching/page.test.mjs app/(dashboard)/teacher/classes/page.test.mjs app/(dashboard)/teacher/attendance/page.test.mjs app/(dashboard)/teacher/assignments/page.test.mjs app/(dashboard)/teacher/results/page.test.mjs
```

Expected:
- FAIL because the teaching hub is missing or incomplete
- FAIL because detail pages do not yet align to the new hub

**Step 3: Write minimal implementation**

Implement the teaching hub with:
- today’s classes summary
- attendance log summary
- assignments requiring grading
- results requiring review or publishing

Update detail pages so headers and CTAs align to the hub and use stronger teacher language.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for hub and cross-link assertions

**Step 5: Commit**

```bash
git add webapp/app/(dashboard)/teacher/teaching/page.tsx webapp/app/(dashboard)/teacher/teaching/page.test.mjs webapp/app/(dashboard)/teacher/classes/page.tsx webapp/app/(dashboard)/teacher/attendance/page.tsx webapp/app/(dashboard)/teacher/assignments/page.tsx webapp/app/(dashboard)/teacher/results/page.tsx
git commit -m "feat: add teacher teaching hub"
```

### Task 4: Build the teacher inbox hub

**Files:**
- Create: `webapp/app/(dashboard)/teacher/inbox/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/messages/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/announcements/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/notifications/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/events/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/messages/page.test.mjs`
- Modify: `webapp/app/(dashboard)/teacher/notifications/page.test.mjs`
- Create: `webapp/app/(dashboard)/teacher/inbox/page.test.mjs`

**Step 1: Write the failing test**

Add assertions that the inbox hub includes:
- sections for messages, announcements, notifications, and events
- teacher-specific communication copy
- links into the retained detail pages

Add assertions to detail pages for consistent back-links or CTA references to `/teacher/inbox`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test app/(dashboard)/teacher/inbox/page.test.mjs app/(dashboard)/teacher/messages/page.test.mjs app/(dashboard)/teacher/notifications/page.test.mjs
```

Expected:
- FAIL because the inbox hub does not exist
- FAIL because detail pages are not yet aligned to the inbox workspace

**Step 3: Write minimal implementation**

Implement the inbox hub with:
- unread messages summary
- school announcements section
- notifications requiring action
- linked event visibility

Update the detail pages to use stronger teacher communication language and hub-aware navigation.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for inbox hub and cross-link assertions

**Step 5: Commit**

```bash
git add webapp/app/(dashboard)/teacher/inbox/page.tsx webapp/app/(dashboard)/teacher/inbox/page.test.mjs webapp/app/(dashboard)/teacher/messages/page.tsx webapp/app/(dashboard)/teacher/announcements/page.tsx webapp/app/(dashboard)/teacher/notifications/page.tsx webapp/app/(dashboard)/teacher/events/page.tsx webapp/app/(dashboard)/teacher/messages/page.test.mjs webapp/app/(dashboard)/teacher/notifications/page.test.mjs
git commit -m "feat: add teacher inbox hub"
```

### Task 5: Rewrite teacher profile as a teacher-owned page

**Files:**
- Modify: `webapp/app/(dashboard)/teacher/profile/page.tsx`
- Modify: `webapp/app/app/profile/page.tsx`
- Modify: `webapp/app/api/account/profile/route.ts`
- Modify: `webapp/lib/account-profile-client.ts`
- Modify: `webapp/lib/teacher-account-detail.ts`
- Modify: `webapp/app/(dashboard)/teacher/profile/page.test.mjs`

**Step 1: Write the failing test**

Add assertions that teacher profile:
- no longer imports the generic app profile page
- includes sections for editable personal details, school identity, teaching assignment, and admin-managed guidance
- contains teacher-specific copy such as assigned classes, assigned subjects, supervised classes, and editability guidance

If needed, add API-level assertions that the profile payload exposes the fields required by the new teacher page.

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test app/(dashboard)/teacher/profile/page.test.mjs lib/teacher-account-detail.test.mjs
```

Expected:
- FAIL because the page still proxies generic account UI
- FAIL if the required teacher summary data is missing or named incorrectly

**Step 3: Write minimal implementation**

Rewrite the teacher profile page to:
- use shared teacher workspace state
- allow editing only personal fields
- present employment and assignment information clearly
- explain which data is admin-managed

Only adjust the shared account API and teacher detail loader where the teacher page needs clearer payload structure or naming.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for page structure and teacher-data assertions

**Step 5: Commit**

```bash
git add webapp/app/(dashboard)/teacher/profile/page.tsx webapp/app/(dashboard)/teacher/profile/page.test.mjs webapp/app/app/profile/page.tsx webapp/app/api/account/profile/route.ts webapp/lib/account-profile-client.ts webapp/lib/teacher-account-detail.ts
git commit -m "feat: rewrite teacher profile workspace"
```

### Task 6: Rewrite teacher settings as a teacher-owned page

**Files:**
- Modify: `webapp/app/(dashboard)/teacher/settings/page.tsx`
- Modify: `webapp/app/app/settings/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/settings/page.test.mjs`

**Step 1: Write the failing test**

Add assertions that teacher settings:
- no longer imports the generic app settings page
- includes teacher-specific sections for password, session, notification behavior, and workspace preferences
- avoids shallow strings such as generic settings labels without teacher context

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test app/(dashboard)/teacher/settings/page.test.mjs app/app/settings/page.test.mjs
```

Expected:
- FAIL because teacher settings still proxies the generic account settings page
- FAIL if generic shallow wording remains in the teacher page

**Step 3: Write minimal implementation**

Rewrite teacher settings to:
- own its page structure and copy
- use shared workspace state for account status display
- keep password and sign-out flows intact
- either connect stored preferences to teacher workspace behavior or remove dead options

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for teacher settings ownership and copy assertions

**Step 5: Commit**

```bash
git add webapp/app/(dashboard)/teacher/settings/page.tsx webapp/app/(dashboard)/teacher/settings/page.test.mjs webapp/app/app/settings/page.tsx
git commit -m "feat: rewrite teacher settings workspace"
```

### Task 7: Strengthen teacher dashboard copy and loading behavior

**Files:**
- Modify: `webapp/app/(dashboard)/teacher/page.tsx`
- Modify: `webapp/app/(dashboard)/teacher/page.test.mjs`

**Step 1: Write the failing test**

Add assertions that the teacher dashboard:
- uses stronger teacher-task language instead of shallow labels
- links prominently to `/teacher/teaching` and `/teacher/inbox`
- reads shared workspace state first rather than duplicating account bootstrap logic

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test app/(dashboard)/teacher/page.test.mjs
```

Expected:
- FAIL because the dashboard still emphasizes the old flat workflow and repeated loading pattern

**Step 3: Write minimal implementation**

Update dashboard copy and structure so it:
- acts as a day-start page
- points into the new hubs
- uses local loading only for truly dashboard-specific data

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for dashboard content and route assertions

**Step 5: Commit**

```bash
git add webapp/app/(dashboard)/teacher/page.tsx webapp/app/(dashboard)/teacher/page.test.mjs
git commit -m "feat: refocus teacher dashboard"
```

### Task 8: Verify teacher-specific route consistency and regression coverage

**Files:**
- Modify: `webapp/route-status.json`
- Modify: `webapp/teacher-workspace-regression.test.mjs`
- Modify: any touched teacher page tests from prior tasks

**Step 1: Write the failing test**

Add or extend a teacher workspace regression to assert:
- the new teacher hubs exist
- primary teacher navigation is stable
- detail pages remain reachable
- profile and settings stay in the teacher route tree

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test teacher-workspace-regression.test.mjs
```

Expected:
- FAIL until the regression is updated for the new workspace contract

**Step 3: Write minimal implementation**

Update the regression assets and route expectations to reflect the tighter teacher workspace.

**Step 4: Run test to verify it passes**

Run:

```bash
cd webapp
node --test teacher-workspace-regression.test.mjs components/teacher-shell.test.mjs app/(dashboard)/teacher/page.test.mjs app/(dashboard)/teacher/teaching/page.test.mjs app/(dashboard)/teacher/inbox/page.test.mjs app/(dashboard)/teacher/profile/page.test.mjs app/(dashboard)/teacher/settings/page.test.mjs app/(dashboard)/teacher/messages/page.test.mjs app/(dashboard)/teacher/notifications/page.test.mjs app/(dashboard)/teacher/classes/page.test.mjs app/(dashboard)/teacher/attendance/page.test.mjs app/(dashboard)/teacher/assignments/page.test.mjs app/(dashboard)/teacher/results/page.test.mjs
```

Expected:
- PASS across the teacher route, shell, and page regressions

**Step 5: Commit**

```bash
git add webapp/route-status.json webapp/teacher-workspace-regression.test.mjs webapp/components/teacher-shell.test.mjs webapp/app/(dashboard)/teacher
git commit -m "test: cover teacher workspace regression flow"
```

### Task 9: Run build and targeted verification

**Files:**
- No source changes expected

**Step 1: Run targeted tests**

Run:

```bash
cd webapp
node --test teacher-workspace-regression.test.mjs components/teacher-shell.test.mjs components/teacher-workspace-provider.test.mjs app/(dashboard)/teacher/page.test.mjs app/(dashboard)/teacher/teaching/page.test.mjs app/(dashboard)/teacher/inbox/page.test.mjs app/(dashboard)/teacher/profile/page.test.mjs app/(dashboard)/teacher/settings/page.test.mjs app/(dashboard)/teacher/messages/page.test.mjs app/(dashboard)/teacher/notifications/page.test.mjs app/(dashboard)/teacher/classes/page.test.mjs app/(dashboard)/teacher/attendance/page.test.mjs app/(dashboard)/teacher/assignments/page.test.mjs app/(dashboard)/teacher/results/page.test.mjs lib/teacher-account-detail.test.mjs
```

Expected:
- PASS

**Step 2: Run type-aware production verification**

Run:

```bash
cd webapp
npm.cmd run build
```

Expected:
- successful Next.js production build

**Step 3: Commit**

```bash
git add .
git commit -m "feat: ship tighter teacher workspace"
```
