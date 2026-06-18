# Development

This document describes how you work on the codebase day to day: setup, commands, conventions, and what the CI does. For the production deployment story, see [PRODUCTION.md](./PRODUCTION.md). For findings, see [AUDIT.md](./AUDIT.md).

## Setup

You need Node.js (matching `.nvmrc` if present), npm, and access to a Supabase project. The setup is:

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, and service role key (only if you need the strict tenant audit locally).
3. `npm run dev` to start the Next.js server on port 3000.
4. `npm run cloudflare:status` if you are working on the gateway worker.

## Commands

The scripts you will use most:

- `npm run dev` — start the Next.js dev server.
- `npm run build` and `npm run start` — production build and run.
- `npm test` — run all 27 static-grep tests under `__tests__/`.
- `npm run test:security` — run the security-focused subset (auth rate limit, middleware, service-role tenant audit, API route auth contract).
- `npm run lint` — ESLint across the repo.
- `npm run schema:check` — verify local migrations match the running schema.
- `npm run audit:tenant` — list service-role imports.
- `npm run audit:tenant:strict` — fail on service-role queries missing a school filter.

## Branching

You branch off `main`. Branch names are `feat/<short-name>`, `fix/<short-name>`, or `chore/<short-name>`. You commit with explicit `git add <path>`. You do not run `git add -A` or `git add .` and you do not skip hooks with `--no-verify`.

## Pull request checklist

Before you request review, you confirm:

- [ ] `npm run lint` passes.
- [ ] `npm test` passes (the static-grep tests under `__tests__/`).
- [ ] `npm run schema:check` passes if you touched a migration.
- [ ] `npm run audit:tenant:strict` passes if you touched a server file.
- [ ] No new `console.log` left in the diff.
- [ ] No `any` introduced in a TypeScript file you touched.
- [ ] No token, key, or URL leaked into a log line or a commit message.
- [ ] Your diff is under 400 lines or you have called out why it cannot be split.

## Code style

- One component per file. Default export at the bottom.
- `useMemo` for derived data; `useCallback` for stable handlers. Smallest dep arrays you can justify.
- No `any`. No `// @ts-ignore`. If you need it, the type is wrong and you should fix the type.
- No raw color values; read from `app/globals.css` tokens.
- No `100vh` in CSS; use `100dvh` for shell layouts.

## Static-grep tests

The test suite is intentionally static: each test reads a target file and asserts that specific symbols, paths, or strings are present. You write one when a refactor risks silently removing a public symbol or breaking a contract. The runner is `scripts/run-tests.mjs`. See [AUDIT.md](./AUDIT.md) for the current freshness audit (25 current, 2 needs-update).

## When you get stuck

If a build fails with a cache error, `npm run clean` then rebuild. If the gateway worker is unreachable in dev, the gateway client falls back to the local API route — you do not need it to develop the frontend. If a Supabase migration fails locally, drop the schema and re-apply from `supabase/migrations/` in order.
