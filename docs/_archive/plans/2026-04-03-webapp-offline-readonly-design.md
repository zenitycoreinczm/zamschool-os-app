# Webapp Offline Read-Only Design

**Date:** 2026-04-03

**Goal:** Make the webapp resilient on poor connectivity by preloading a small authenticated core, showing clear connectivity state, and serving cached read-only content only when the browser is actually offline.

## Problem

The current webapp assumes live connectivity for nearly every view. Shared fetch helpers default to `cache: "no-store"`, there is no service worker, and authenticated shells do not surface network state. On weak or intermittent links this produces slow spinners, repeated fetch failures, and no usable fallback when a school loses connection.

## Non-Goals

- No offline writes or mutation queue in this slice
- No full IndexedDB data model
- No broad PWA install flow or app-shell redesign
- No change to online behavior beyond a light slow-network warning

## Product Rules

1. Offline mode is active only when the browser is actually offline.
2. Slow network does not switch the app into offline mode.
3. When online, the app should continue to prefer live responses and refresh caches quietly.
4. When offline, the app may show cached content for a curated core only.
5. Any write action attempted while offline must fail clearly and immediately.

## Recommended Approach

Use a service worker plus a small shared connectivity layer.

- The service worker caches static assets, an offline fallback page, selected authenticated route documents, and selected GET API responses.
- After the authenticated shell mounts, the client warms a curated core set of pages and GET endpoints so they are ready if the connection drops later.
- Shared fetch helpers record latency and offline failures so the UI can classify `online`, `slow`, and `offline`.
- Authenticated shells render a small connectivity banner with status and last-sync information.

## Core Offline Scope

Preload and support read-only offline access for:

- `/app/dashboard`
- `/app/admin/users`
- `/app/admin/fees`
- `/app/admin/finance`
- `/app/announcements`

And the GET APIs those pages rely on:

- `/api/admin/users`
- `/api/admin/classes`
- `/api/admin/subjects`
- `/api/admin/finance`
- `/api/admin/payments`
- `/api/admin/announcements`

The exact list should live in one shared module so the shell, tests, and service worker use the same source of truth.

## Connectivity Model

Three states are exposed to the UI:

- `online`: browser online, recent requests within latency budget
- `slow`: browser online, but recent requests exceed a latency threshold
- `offline`: browser offline or live request path failed because there is no network

`offline` is driven first by `navigator.onLine` and browser `online`/`offline` events. `slow` is derived from measured request duration in shared fetch helpers. The app must not infer offline mode from slow latency alone.

## Caching Strategy

### Static Assets

Use `stale-while-revalidate` for app shell assets and route chunks.

### Core Page Routes

Use `network-first` with offline cache fallback for navigation requests that match the curated core route list.

### Core GET APIs

Use `network-first` while online and cache the successful response. When offline, allow cached GET responses for the curated core endpoint list.

### Non-Core Requests

Leave non-core requests online-only for this slice. If a non-core page is opened offline without a cached route document, show the offline fallback page.

## UX

### Slow Network Banner

When online but request latency is high, show a lightweight non-blocking warning such as `Network is slow`. This is informational only.

### Offline Banner

When offline, show a stronger banner indicating the user is offline, that content may be stale, and the latest successful sync time.

### Offline Fallback Page

If the user opens an uncached page while offline, show a dedicated offline page instead of indefinite loading.

### Offline Writes

POST, PUT, PATCH, and DELETE requests remain online-only. If the browser is offline, shared fetch helpers should fail fast with an offline-specific error message so forms and buttons can respond clearly.

## Implementation Shape

### Shared Modules

- `webapp/lib/offline-support.ts`: core routes, core GET endpoints, cache names, thresholds, and pure helpers
- `webapp/lib/network-status.ts`: small browser-side store for connectivity state and last-sync metadata

### UI

- `webapp/components/OfflineStatusProvider.tsx`
- `webapp/components/OfflineStatusBanner.tsx`
- wire into authenticated shell layout in `webapp/app/app/layout.tsx`

### Service Worker

- `webapp/public/sw.js`
- register from the authenticated app shell only

### Fallback Route

- `webapp/app/offline/page.tsx`

## Risks

- Cached authenticated HTML can become stale, so the product must communicate last-sync time
- Over-caching large admin surfaces can increase warmup cost, so the core list must stay small
- Pages with many uncached secondary requests may still degrade offline even if the route HTML is cached

## Future Follow-Ups

- Add mutation queue for attendance and fee entry
- Promote more pages into the curated offline core once behavior is proven
- Consider IndexedDB-backed structured caching for richer offline browsing
