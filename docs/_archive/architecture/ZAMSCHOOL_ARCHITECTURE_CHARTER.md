# ZamSchool OS - Architecture Charter

## North Star

Publishers write once. Readers get cached, filtered views. Alerts instead of polling.

## Architecture Layers

### 1. Data Producers
- **Teachers**: Assignments, results, attendance, messages, discipline records
- **Admins**: Classes, subjects, timetable, announcements, academic years, grading scales
- **Bursars/Payments**: Fees, billing, finance records, payment tracking
- **Students**: Assignment submissions
- **Parents**: Absence reports
- **Staff**: School configuration, access codes, invitations

### 2. Data Consumers
- **Students**: View assignments, results, attendance, timetable, discipline record
- **Parents**: View all children's data across academic dimensions
- **Teachers**: View classes, students, teaching load, results completeness
- **Admins**: Full administrative visibility
- **Principal/Deputy Head**: School-wide oversight
- **Department Heads**: Subject/department-level oversight
- **Guidance Office**: Discipline and welfare records

### 3. Delivery Layer
- **Edge Caching**: Middleware-applied cache policy for API and page responses
- **CDN**: Cloudflare R2 for avatar images and static assets
- **Redis**: API response caching for frequently accessed data
- **Middleware**: Auth, routing, CORS, CSP at edge

### 4. Core Database (Supabase PostgreSQL)
- **RLS**: Row-level security enforced on all tables by user role and school_id
- **Realtime**: Sync triggers for messaging and notifications
- **Migrations**: 48 sequential migrations for schema evolution

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Edge gateway | Cloudflare Workers (`workers/gateway/`) |
| Cache | Redis (ioredis) + Cloudflare Cache API + Workers KV |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth with MFA (TOTP) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Animations | Motion |
| Forms | React Hook Form + Zod 4 |
| Charts | Recharts, React Big Calendar |
| CDN | Cloudflare R2 (S3-compatible) |
| Email | Nodemailer |

## User Roles (14)

| Role | Type | Access Level |
|------|------|-------------|
| SUPER_ADMIN | System | All schools, system configuration |
| ADMIN | School | Full school administration |
| PRINCIPAL | School | School-wide oversight |
| DEPUTY_HEAD | School | Academic and administrative oversight |
| BURSAR | School | Financial management |
| ACADEMIC_ADMIN | School | Academic scheduling and planning |
| DISCIPLINE_ADMIN | School | Discipline record management |
| HR_ADMIN | School | Staff management |
| ICT_ADMIN | School | Technical administration |
| GUIDANCE_OFFICE | School | Student welfare |
| TEACHER | Academic | Classroom management |
| STUDENT | Academic | Personal academic portal |
| PARENT | Academic | Child monitoring portal |
| PAYMENTS | Financial | Payment processing |

## API Design Principles

1. **Domain-oriented**: APIs organized by domain (admin, teacher, student, parent, auth, payments)
2. **Role-scoped**: Each API validates the caller's role and school_id
3. **Validated**: All inputs validated with Zod 4 schemas
4. **Rate-limited**: Edge caching applied per route and method
5. **CORS-protected**: Origin validation for all API requests
6. **Auditable**: Critical actions logged with user identity

## Foundational Principles (Worker gateway cutover)

1. **Cloudflare Worker is the ONLY public API gateway.** When
   `NEXT_PUBLIC_GATEWAY_URL` is set, every browser / mobile call routes through
   `workers/gateway/`. When unset, callers fall through to the same-origin
   `/api/*` so dev / preview branches keep working. The Worker is the sole
   place where JWT verification, per-IP / per-tenant rate limiting, edge
   caching, and signed-URL issuance for R2 happen.
2. **Supabase is NEVER directly exposed to the browser beyond the anon key.**
   The anon key is safe to ship because Supabase RLS enforces row-level access.
3. **Redis is for speed + limits ONLY.** Approved prefixes (`rl:`, `role:`,
   `sess:`, `tmp:`, `daily:`, `shell:`, `dash:`, `ws:`) live in
   `lib/redis-keys.ts`. Anything outside this allowlist routes to an in-memory
   hot-read cache or Supabase directly.
4. **R2 access is via Worker-issued signed URLs only.** Browser never sees R2
   keys. Uploads POST to `/api/upload` on the Worker, which authorizes, then
   writes the byte stream directly to R2. No Vercel function bandwidth is
   consumed.
5. **Supabase = persistence ONLY.** React components do not query Supabase
   for shell chrome — they go through the API gateway (Worker → Next.js).
   Anything that does not need to be fresh should be cached at the edge
   (Worker) or in Redis.

### Gateway routing

| Hop | Source | When it runs |
|-----|--------|--------------|
| Browser / mobile | `lib/gateway-read-client.ts` (`fetchGatewayRead` / `fetchGatewayMutation` / `uploadViaGateway`) | Picks Worker URL when set, falls back to `/api/*` |
| Cloudflare Worker | JWT verify → rate-limit → edge cache (GET) → proxy → offline DO queue (POST) | When `NEXT_PUBLIC_GATEWAY_URL` is set |
| Vercel `/api/*` | Existing Next.js handlers (source of truth for auth + business logic) | When Worker URL unset, OR when Worker proxies upstream for validation |
| Supabase | Bearer-bound client for reads; service role OK because Worker has already validated JWT and tenant context | Only inside `/api/*` handlers |

**Rollback:** unset `NEXT_PUBLIC_GATEWAY_URL` (and `EXPO_PUBLIC_GATEWAY_URL`
for mobile). All clients revert to direct `/api/*` calls with no code change.

**Deploy:** see [`workers/gateway/README.md`](../workers/gateway/README.md)
for the full `wrangler` runbook (KV / R2 / DO provisioning, secret management,
and `[vars]` configuration). When the Worker is not yet deployed, the path
above stays green because every client transparently falls back to `/api/*`.

## V1 Scope

Completed capabilities:
- [x] Role-based authentication and authorization
- [x] Multi-factor authentication (TOTP)
- [x] Class, subject, and timetable management
- [x] Assignment creation and submission
- [x] Attendance tracking
- [x] Grading and result publishing workflow
- [x] Discipline records
- [x] Announcements and notifications
- [x] Internal messaging
- [x] Payment processing and billing
- [x] Finance tracking
- [x] Parent portal (attendance, results, fees, discipline)
- [x] Student portal
- [x] Staff invitations and access codes
- [x] Department management
- [x] Academic year and term configuration
- [x] Audit logging
- [x] CDN-backed asset delivery (R2)
- [x] Offline read-only mode
- [x] Workspace-based shell composition

## Security Model

- **Authentication**: Supabase Auth with JWT sessions
- **MFA**: TOTP enforced for elevated roles
- **Authorization**: RLS at database level + middleware route protection
- **Data Isolation**: Multi-tenant via school_id on all tables
- **Audit Trail**: All critical actions logged to audit_logs table
- **Edge Security**: CSP, HSTS, CORS headers on every response

## Related Documents

- PR checklist: [PR_CHECKLIST.md](PR_CHECKLIST.md)
- Migration order: [MIGRATION_APPLY_ORDER.md](MIGRATION_APPLY_ORDER.md)
- Implementation summary: [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)
- Production readiness: [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)