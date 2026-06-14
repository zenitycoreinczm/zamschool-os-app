# ZamSchool OS

ZamSchool OS is a production-grade school management system for Zambia, designed to streamline educational administration and enhance the learning experience. Built with Next.js 16 and Supabase, it provides a unified platform for administrators, teachers, parents, students, and school staff.

## Key Features

### Administration & Oversight
- **School Infrastructure**: Manage classes, subjects, departments, and grade levels.
- **Academic Planning**: Configure academic years, terms, and grading scales.
- **Audit Logging**: Track system actions for security and compliance.
- **User Management**: Unified role-based access for 14 user roles.
- **Staff Invitations**: Send and manage staff onboarding via access codes.
- **Access Codes**: Generate and manage school registration codes.

### Academic Excellence
- **Timetable Management**: Interactive scheduling for classes and subjects.
- **Assignment Tracking**: Distribute and monitor student assignments with submissions.
- **Grading System**: Customizable grading scales with result publishing workflow.
- **Results Management**: Teacher upload, completeness checks, publish/unpublish workflow.
- **Discipline Records**: Track student discipline with categories and stats.

### Financial Management
- **Payment Processing**: Track tuition and fees with billing and student fee management.
- **Finance Records**: Comprehensive income and expense tracking.
- **Payments Role**: Dedicated role for bursars and payments staff.
- **Reporting**: Visual summaries of financial health and net balance.

### Communication & Engagement
- **Internal Messaging**: Secure messaging system between users.
- **Announcements**: School-wide broadcasts for important updates.
- **Real-time Notifications**: Instant alerts for events, payments, and academic updates.
- **Parent Portal**: View children's attendance, results, fees, discipline, and timetable.

### Student & Parent Portals
- **Student Dashboard**: View assignments, attendance, results, discipline, schedule.
- **Parent Dashboard**: Monitor multiple children across all academic dimensions.
- **Absence Reporting**: Parents can report student absences.

### Security & Infrastructure
- **Multi-Factor Authentication**: TOTP-based MFA enrollment and challenge.
- **Row Level Security (RLS)**: Enforced at the database level for all user roles.
- **Rate Limiting**: API routes protected against abuse via edge caching.
- **Content Security Policy**: Strict CSP headers on all responses.
- **CORS Protection**: Origin-validated API access.
- **Cloudflare R2**: CDN-backed file storage for avatars and assets.
- **Offline Support**: Read-only offline mode for intermittent connectivity.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, standalone output)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod 4](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/) & [React Big Calendar](https://jquense.github.io/react-big-calendar/)
- **Image CDN**: Cloudflare R2 (S3-compatible)
- **Caching**: Redis (ioredis)
- **Email**: Nodemailer
- **Notifications**: Sonner

---

## Architecture

Official product charter: [docs/ZAMSCHOOL_ARCHITECTURE_CHARTER.md](docs/ZAMSCHOOL_ARCHITECTURE_CHARTER.md)

- **North star:** Publishers write once, readers get cached, filtered views, alerts instead of polling.
- **Workspace:** Role-based shell composition with teacher workspace provider.
- **PR checklist:** [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md)
- **Migration order:** [docs/MIGRATION_APPLY_ORDER.md](docs/MIGRATION_APPLY_ORDER.md)

---

## User Roles

The system supports 14 roles with granular permissions:

| Role | Path Prefix |
|------|-------------|
| Super Admin | `/app/super-admin` |
| Admin | `/app/admin/*` |
| Principal | `/app/principal` |
| Deputy Head | `/app/deputy-head` |
| Bursar | `/app/bursar`, `/app/payments` |
| Academic Admin | `/app/academic-admin` |
| Discipline Admin | `/app/discipline-admin` |
| HR Admin | `/app/hr-admin` |
| ICT Admin | `/app/ict-admin` |
| Guidance Office | `/app/guidance` |
| Teacher | `/teacher/*` |
| Student | `/student/*` |
| Parent | `/parent/*` |
| Payments | `/app/payments` |

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A Supabase account and project
- (Optional) Cloudflare R2 bucket for file storage

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_ASSETS_BUCKET=zamschool-assets
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### 3. Installation

```bash
npm install
```

### 4. Database Migration

Apply migrations in order from `migrations/` folder following [MIGRATION_APPLY_ORDER.md](docs/MIGRATION_APPLY_ORDER.md). There are 48 migration files covering schema, RLS policies, triggers, and hardening.

### 5. Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## Project Structure

```
/app                          # Next.js App Router pages and API routes
  /app                        # Authenticated app pages (role-based)
    /admin/*                  # Admin dashboard and management pages
    /teacher                  # Teacher workspace
    /bursar                   # Bursar dashboard
    /principal                # Principal dashboard
    /payments                 # Payment management
    /super-admin              # Super admin panel
    /discipline-admin         # Discipline management
    /academic-admin           # Academic administration
    /deputy-head              # Deputy head dashboard
    /hr-admin                 # HR administration
    /ict-admin                # ICT administration
    /guidance                 # Guidance office
  /api                        # API routes
    /account/*                # User account APIs
    /admin/*                  # Admin CRUD APIs
    /auth/*                   # Authentication (MFA, OTP, registration)
    /teacher/*                # Teacher-specific APIs
    /student/*                # Student-specific APIs
    /parent/*                 # Parent-specific APIs
    /payments/*               # Payment processing APIs
    /files/*                  # File upload APIs
  /teacher/*                  # Teacher-facing pages
  /student/*                  # Student-facing pages
  /parent/*                   # Parent-facing pages
  /login/*                    # Login and MFA pages
/components                   # Reusable UI components and shell layouts
  /admin                      # Admin-specific components
  /teacher                    # Teacher-specific components
  /auth                       # Auth-related components
  /payments                   # Payment components
  /charts                     # Chart components
  /landing                    # Landing page components
/lib                          # Shared utilities and database clients
/hooks                        # Custom React hooks
/migrations                   # SQL migration scripts (001-048)
/public                       # Static assets
/scripts                      # Utility scripts (CDN, preflight, load testing)
/workers                      # Edge function workers
/cloudflare-integration       # Cloudflare R2/CDN documentation
/docs                         # Project documentation
```

---

## Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Generate production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run test suite |
| `npm run test:all` | Run all tests |
| `npm run test:security` | Run security-focused tests |
| `npm run schema:check` | Validate database schema |
| `npm run schema:check:strict` | Strict schema validation |
| `npm run healthcheck` | Run health check |
| `npm run audit:tenant` | Run tenant isolation audit |
| `npm run audit:tenant:strict` | Strict tenant audit |
| `npm run cdn:status` | Check CDN configuration |
| `npm run cdn:cache-rules` | Verify CDN cache rules |
| `npm run cdn:discover-r2` | Discover R2 public URL |
| `npm run cdn:preflight` | Run CDN preflight checks |
| `npm run load:smoke` | Load test (smoke) |
| `npm run load:tier1` | Load test (100 users) |
| `npm run load:tier2` | Load test (500 users) |
| `npm run load:tier3` | Load test (1000 users) |
| `npm run pilot:preflight` | Pilot school preflight check |
| `npm run pilot:log-incident` | Log pilot incident |
| `npm run production:sign-off` | Generate production sign-off |

---

## Security

- **Row Level Security (RLS)**: Enforced at database level for all tables.
- **Multi-Factor Authentication**: TOTP-based MFA with enrollment and challenge flow.
- **Rate Limiting**: API routes protected via edge caching and middleware.
- **Input Validation**: Zod 4 schemas for all data flows.
- **Content Security Policy**: Strict CSP with nonce-based script loading.
- **CORS**: Origin-validated API access with preflight handling.
- **HSTS**: Strict Transport Security on HTTPS connections.
- **Audit Logging**: All critical actions logged with user identity and timestamp.
- **Tenant Isolation**: Service role protection with school_id scoping.

---

## Production Readiness

- **Migrations**: 48 applied in strict order
- **RLS**: All tables hardened with row-level security
- **Performance**: Read-optimized queries with edge caching
- **CDN**: Cloudflare R2 for static asset delivery
- **Monitoring**: Health check endpoint, audit logs
- **Disaster Recovery**: Documented runbook with RPO/RTO targets
- **Load Testing**: Tiered load test scenarios (smoke, 100, 500, 1000 users)