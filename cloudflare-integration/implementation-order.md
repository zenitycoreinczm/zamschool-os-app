# Implementation Order

## Priority Matrix

| Phase | Task | Effort | Impact | Risk | Dependencies |
|---|---|---|---|---|---|
| **1** | R2 client setup | Small | Foundation | None | None |
| **2** | Migrate avatar upload | Small | Medium | Low | Phase 1 |
| **3** | Generic file upload API | Medium | High | Low | Phase 1 |
| **4** | Assignment file attachments | Medium | **Highest** | Low | Phase 3 |
| **5** | Worker gateway | Large | High | Medium | Phase 1 |
| **6** | Cloudflare Images | Medium | Medium | Low | Phase 2 |
| **7** | KV rate limiting | Medium | Low | Medium | Phase 1 |

## Phase 1 — R2 Client ✅ (COMPLETE)

- [x] Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [x] Create `zamschool-assets` and `zamschool-uploads` buckets
- [x] Verify all CRUD operations
- [ ] Create `lib/r2-client.ts` with all helper functions
- [ ] Add env vars to `.env.local` and `.env.example`

**Status: CREATED, CODE NEEDS WRITING**

## Phase 2 — Migrate Avatar (1-2 hours)

- [ ] Rewrite `app/api/account/avatar/route.ts` to use R2
- [ ] Update `next.config.ts` remotePatterns
- [ ] Write backfill migration script
- [ ] Test end-to-end avatar upload flow

## Phase 3 — Generic File Upload API (2-3 hours)

- [ ] Create `app/api/files/upload/route.ts`
- [ ] Create `app/api/files/delete/route.ts`
- [ ] Add rate limiting for file_upload category
- [ ] Add `uploadFile()` helper to `lib/api-client.ts`
- [ ] Test with curl / browser

## Phase 4 — Assignment File Attachments (3-4 hours)

- [ ] Run `017_add_file_attachments.sql` migration
- [ ] Update teacher assignment API schema
- [ ] Add file picker to teacher assignment form
- [ ] Update student submission API schema
- [ ] Add file upload to student submission dialog
- [ ] Update Zod schemas everywhere

## Phase 5 — Worker Gateway (4-6 hours)

- [ ] Install wrangler
- [ ] Create `workers/gateway/` with wrangler.toml
- [ ] Implement `src/index.ts` router
- [ ] Implement `src/auth.ts` token verification
- [ ] Implement `src/upload.ts` direct R2 upload
- [ ] Implement `src/image.ts` image optimization proxy
- [ ] Update `lib/api-client.ts` to use Worker
- [ ] Deploy Worker

## Phase 6 — Cloudflare Images (2-3 hours)

- [ ] Enable Cloudflare Images
- [ ] Create `lib/images-client.ts`
- [ ] Create `components/CloudflareImage.tsx`
- [ ] Integrate with avatar upload
- [ ] Update next.config.ts remotePatterns

## Phase 7 — KV Rate Limiting (2-3 hours)

- [ ] Create KV namespace via wrangler
- [ ] Create `lib/kv-client.ts`
- [ ] Update `lib/rate-limit.ts` with KV provider
- [ ] Test rate limit behavior
- [ ] Remove Redis dependency if KV is stable

## Quick Wins First

**Recommended immediate start: Phases 1→2→3→4** (everything needed for file attachments). The Worker gateway and KV are optimizations you can add later.

## Rollout Strategy

1. Implement Phase 1-4 in a feature branch
2. Deploy to staging, test with a test school
3. Run avatar backfill script
4. Deploy to production
5. Gradually roll out Worker gateway and KV

## Rollback Plan

- **Phase 2**: Avatar route can be reverted to use Supabase Storage by reverting the file
- **Phase 4**: All DB columns are nullable, so old code works without changes
- **R2 data**: Data in R2 buckets persists independently — no data loss on rollback
