# Webapp Offline Read-Only Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a read-only offline mode for a curated authenticated webapp core, plus slow-network and offline status messaging, without introducing offline writes.

**Architecture:** Introduce one shared offline support module that defines the curated cache scope and connectivity thresholds, then build a browser-side status store and service-worker registration on top of it. Keep online behavior live-first, show cached content only when the browser is offline, and fail mutations immediately when there is no connection.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, service worker in `public/`, node:test source and pure-module tests

---

### Task 1: Lock the offline contract with failing tests

**Files:**
- Create: `webapp/lib/offline-support.test.mjs`
- Create: `webapp/lib/network-status.test.mjs`
- Create: `webapp/components/offline-status-provider.test.mjs`

**Step 1: Write the failing tests**

Add assertions that require:
- a curated core route list including dashboard, users, fees, finance, and announcements
- a curated core GET API list for those pages
- a latency threshold that maps slow connections without marking them offline
- a network status store that can move between `online`, `slow`, and `offline`
- an authenticated layout/provider integration that references an offline status provider and banner

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test lib/offline-support.test.mjs lib/network-status.test.mjs components/offline-status-provider.test.mjs
```

Expected:
- FAIL because the offline support module, network-status module, and provider do not exist yet

**Step 3: Write minimal implementation**

Create the shared offline module and the smallest possible status store/provider surfaces needed to satisfy the tests.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for the offline contract and provider integration assertions

### Task 2: Add offline-aware shared request behavior

**Files:**
- Modify: `webapp/lib/admin-browser-api.ts`
- Modify: `webapp/lib/admin-route-client.ts`
- Modify: `webapp/lib/api-client.ts`
- Modify: `webapp/lib/network-status.ts`
- Create: `webapp/lib/offline-fetch.test.mjs`

**Step 1: Write the failing test**

Add assertions that require:
- GET requests can report latency and successful sync timestamps
- mutation methods fail fast with an offline error when `navigator.onLine === false`
- the wrappers notify the network-status layer about slow requests and offline failures

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test lib/offline-fetch.test.mjs lib/network-status.test.mjs
```

Expected:
- FAIL because the wrappers do not yet guard offline mutations or report network state

**Step 3: Write minimal implementation**

Refactor shared fetch helpers to:
- wrap requests in timing logic
- update shared network state on success, slow responses, and network failures
- reject offline mutations before calling `fetch`

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for offline mutation guard and latency reporting behavior

### Task 3: Add authenticated shell offline UI and core warmup

**Files:**
- Create: `webapp/components/OfflineStatusProvider.tsx`
- Create: `webapp/components/OfflineStatusBanner.tsx`
- Modify: `webapp/app/app/layout.tsx`
- Modify: `webapp/components/AuthProvider.tsx`
- Modify: `webapp/lib/offline-support.ts`
- Create: `webapp/components/offline-shell.test.mjs`

**Step 1: Write the failing test**

Add assertions that require:
- the authenticated app layout wraps children with the offline status provider
- the provider registers a service worker
- the provider warms the curated core after auth is ready
- the banner exposes offline and slow-network copy

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test components/offline-status-provider.test.mjs components/offline-shell.test.mjs
```

Expected:
- FAIL because the app layout does not include the provider and there is no warmup/banner logic yet

**Step 3: Write minimal implementation**

Implement the provider and banner, then wire them into the authenticated layout only. Warm the core route and API list after the shell is ready.

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for provider, banner, and warmup assertions

### Task 4: Add the service worker and offline fallback page

**Files:**
- Create: `webapp/public/sw.js`
- Create: `webapp/app/offline/page.tsx`
- Create: `webapp/public/sw.test.mjs`

**Step 1: Write the failing test**

Add assertions that require:
- a service worker cache for static assets
- a network-first strategy for curated route documents and curated GET APIs
- an offline fallback route reference

**Step 2: Run test to verify it fails**

Run:

```bash
cd webapp
node --test public/sw.test.mjs
```

Expected:
- FAIL because the service worker and offline fallback page do not exist yet

**Step 3: Write minimal implementation**

Implement:
- service-worker install/activate handling
- static asset caching
- curated route/API handling
- offline fallback page caching for uncached offline navigations

**Step 4: Run test to verify it passes**

Run the same command and expect:
- PASS for service-worker strategy assertions

### Task 5: Verify the slice end-to-end

**Files:**
- Modify only files touched above as needed

**Step 1: Run targeted automated verification**

Run:

```bash
cd webapp
node --test lib/offline-support.test.mjs lib/network-status.test.mjs lib/offline-fetch.test.mjs components/offline-status-provider.test.mjs components/offline-shell.test.mjs public/sw.test.mjs
```

Expected:
- PASS across all new offline-support tests

**Step 2: Run build verification if network policy allows**

Run:

```bash
cd webapp
npm.cmd run build
```

Expected:
- PASS if the environment can reach font assets
- If it fails on external font fetch, report that exact build blocker instead of claiming full build success

**Step 3: Manual browser verification**

Verify:
- authenticated shell shows no banner on a healthy connection
- authenticated shell shows `Network is slow` on throttled network
- curated pages remain readable after going fully offline
- offline fallback page appears for uncached routes
- write attempts fail fast offline with a clear message
