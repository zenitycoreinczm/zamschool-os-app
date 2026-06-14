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
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth with MFA (TOTP) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Animations | Motion |
| Forms | React Hook Form + Zod 4 |
| Charts | Recharts, React Big Calendar |
| CDN | Cloudflare R2 (S3-compatible) |
| Cache | Redis (ioredis) |
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