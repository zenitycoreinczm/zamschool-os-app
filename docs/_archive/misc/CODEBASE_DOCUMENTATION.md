# ZamSchool OS - Codebase Documentation

## Overview

ZamSchool OS is a production-grade school management system built with Next.js 16 (App Router, standalone output), Supabase (PostgreSQL + Auth), and Tailwind CSS 4. It serves 14 user roles across administration, academics, finance, and parent/student portals.

## Directory Structure

```
/
├── app/                          # Next.js App Router
│   ├── app/                      # Authenticated app pages
│   │   ├── academic-admin/       # Academic admin dashboard
│   │   ├── admin/                # Admin management (academic, assignments, attendance, audit, classes, departments, fees, finance, grading-scales, school, staff-invitations, subjects, timetable, users)
│   │   ├── announcements/        # School announcements
│   │   ├── bursar/               # Bursar dashboard
│   │   ├── dashboard/            # Main dashboard
│   │   ├── deputy-head/          # Deputy head dashboard
│   │   ├── discipline-admin/     # Discipline management (categories, records)
│   │   ├── events/               # School events
│   │   ├── guidance/             # Guidance office dashboard
│   │   ├── hr-admin/             # HR administration
│   │   ├── ict-admin/            # ICT administration
│   │   ├── messages/             # Internal messaging
│   │   ├── notifications/        # User notifications
│   │   ├── payments/             # Payment management (fees, students)
│   │   ├── principal/            # Principal dashboard
│   │   ├── profile/              # User profile
│   │   ├── settings/             # User settings
│   │   ├── super-admin/          # Super admin panel
│   │   └── teacher/              # Teacher workspace
│   ├── api/                      # API routes
│   │   ├── account/              # User account APIs
│   │   │   ├── announcements/    # GET announcements
│   │   │   ├── avatar/           # POST/PUT avatar (with media route)
│   │   │   ├── change-password/  # POST change password
│   │   │   ├── class-label/      # GET class label
│   │   │   ├── contacts/         # GET contacts
│   │   │   ├── events/           # GET events
│   │   │   ├── inbox-preview/    # GET inbox preview
│   │   │   ├── messages/         # GET, POST, PUT messages
│   │   │   ├── notifications/    # GET, PUT notifications
│   │   │   ├── profile/          # GET, PUT profile
│   │   │   ├── session/          # GET session
│   │   │   ├── unread-summary/   # GET unread summary
│   │   │   ├── workspace-context/ # GET workspace context
│   │   │   └── workspace-search/ # GET workspace search
│   │   ├── admin/                # Admin APIs
│   │   │   ├── academic-years/   # CRUD
│   │   │   ├── access-codes/     # GET, POST, DELETE + generate/POST
│   │   │   ├── announcements/    # CRUD
│   │   │   ├── assignments/      # CRUD
│   │   │   ├── attendance/       # GET + summary/GET
│   │   │   ├── audit/            # GET audit logs
│   │   │   ├── classes/          # CRUD
│   │   │   ├── events/           # CRUD
│   │   │   ├── finance/          # CRUD
│   │   │   ├── grades/           # CRUD
│   │   │   ├── grading-scales/   # CRUD
│   │   │   ├── messages/         # CRUD
│   │   │   ├── notifications/    # CRUD
│   │   │   ├── payments/         # CRUD
│   │   │   ├── relationships/    # GET, POST
│   │   │   ├── school/           # GET, PUT school config
│   │   │   ├── staff/            # GET + invitations (GET, POST, DELETE with [id])
│   │   │   ├── subjects/         # CRUD
│   │   │   ├── terms/            # CRUD
│   │   │   ├── timetable/        # CRUD
│   │   │   └── users/            # CRUD + reset-password/POST
│   │   ├── auth/                 # Auth APIs
│   │   │   ├── callback/         # Auth callback
│   │   │   ├── complete-first-login/ # POST
│   │   │   ├── mfa/              # challenge/POST, enroll/POST, factors/GET+DELETE, verify/POST
│   │   │   ├── register-school/  # POST
│   │   │   ├── send-otp/         # POST
│   │   │   ├── verify-access-code/ # POST
│   │   │   └── verify-otp/       # POST
│   │   ├── dashboard/            # Dashboard APIs
│   │   │   ├── academic-scope/   # GET
│   │   │   └── summary/          # GET
│   │   ├── debug/                # Debug APIs
│   │   │   ├── env/              # GET env vars
│   │   │   └── inspect_v2/       # GET inspection
│   │   ├── discipline/           # Discipline APIs
│   │   │   ├── categories/       # GET, POST, PUT
│   │   │   ├── records/          # GET, POST, PUT
│   │   │   └── stats/            # GET
│   │   ├── files/                # File APIs
│   │   │   ├── authorize-upload/ # POST
│   │   │   ├── delete/           # POST
│   │   │   └── upload/           # POST
│   │   ├── health/               # GET health check
│   │   ├── parent/               # Parent APIs
│   │   │   ├── absence/          # GET, POST
│   │   │   ├── attendance/       # GET
│   │   │   ├── children/         # GET
│   │   │   ├── dashboard/        # GET
│   │   │   ├── discipline/       # GET
│   │   │   ├── fees/             # GET
│   │   │   ├── reports/          # GET
│   │   │   ├── results/          # GET
│   │   │   ├── teachers/         # GET
│   │   │   └── timetable/        # GET
│   │   ├── payments/             # Payments APIs
│   │   │   ├── billing/          # POST + summary/GET + [studentFeeId]
│   │   │   ├── fees/             # GET, POST + [id]
│   │   │   ├── shell-summary/    # GET
│   │   │   └── students/         # GET, POST
│   │   ├── principal/            # Principal APIs
│   │   │   └── results-unpublish/ # POST
│   │   ├── public/               # Public APIs
│   │   │   └── assets/           # GET (catch-all CDN proxy)
│   │   ├── school/               # School APIs
│   │   │   ├── departments/      # GET, POST, PATCH, DELETE
│   │   │   └── initialize/       # GET, POST
│   │   ├── staff/                # Staff APIs
│   │   │   └── invitations/      # GET, POST, DELETE + accept/POST
│   │   ├── student/              # Student APIs
│   │   │   ├── assignments/      # GET + submissions/POST
│   │   │   ├── attendance/       # GET
│   │   │   ├── dashboard/        # GET
│   │   │   ├── discipline/       # GET
│   │   │   ├── results/          # GET + certificate/GET
│   │   │   └── subjects/         # GET
│   │   ├── super-admin/          # Super admin APIs
│   │   │   └── access-codes/     # GET, POST, DELETE
│   │   ├── teacher/              # Teacher APIs
│   │   │   ├── announcements/    # GET
│   │   │   ├── assignments/      # CRUD
│   │   │   ├── attendance/       # GET, POST
│   │   │   ├── bootstrap/        # GET
│   │   │   ├── classes/          # GET, POST
│   │   │   ├── contacts/         # GET
│   │   │   ├── dashboard/        # GET
│   │   │   ├── events/           # GET
│   │   │   ├── messages/         # GET, POST, PUT
│   │   │   ├── notifications/    # GET, PUT
│   │   │   ├── results/          # GET
│   │   │   ├── results-completeness/ # GET
│   │   │   ├── results-publish/  # POST
│   │   │   ├── results-upload/   # POST
│   │   │   ├── students/         # GET
│   │   │   └── subjects/         # GET
│   │   ├── test-email/           # GET, POST
│   │   ├── upload/               # validate/GET, POST
│   │   └── workspace/            # summary/GET
│   ├── teacher/                  # Teacher-facing pages
│   │   ├── announcements/
│   │   ├── attendance/
│   │   ├── classes/
│   │   ├── discipline/
│   │   ├── events/
│   │   ├── inbox/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── results/
│   │   ├── settings/
│   │   ├── students/
│   │   └── teaching/
│   ├── student/                  # Student-facing pages
│   │   ├── announcements/
│   │   ├── assignments/
│   │   ├── attendance/
│   │   ├── discipline/
│   │   ├── events/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── results/
│   │   └── settings/
│   ├── parent/                   # Parent-facing pages
│   │   ├── absence/
│   │   ├── announcements/
│   │   ├── attendance/
│   │   ├── children/
│   │   ├── discipline/
│   │   ├── events/
│   │   ├── fees/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── reports/
│   │   ├── results/
│   │   ├── settings/
│   │   ├── teachers/
│   │   └── timetable/
│   ├── login/                    # Auth pages (login, MFA, register, forgot-password, reset-password, verify-email)
│   ├── first-login/              # First login password change
│   ├── accept-invitation/        # Staff invitation acceptance
│   ├── join/                     # Join school with access code
│   ├── offline/                  # Offline mode page
│   ├── cookies/                  # Cookie policy
│   ├── privacy/                  # Privacy policy
│   └── terms/                    # Terms of service
├── components/                   # Reusable components
│   ├── AdminShell.tsx            # Admin layout shell
│   ├── TeacherShell.tsx          # Teacher layout shell
│   ├── StudentShell.tsx          # Student layout shell
│   ├── ParentShell.tsx           # Parent layout shell
│   ├── PaymentsShell.tsx         # Payments layout shell
│   ├── RoleBasedShell.tsx        # Generic role-based shell
│   ├── AuthProvider.tsx          # Auth context provider
│   ├── SupabaseGuardBootstrap.tsx # Supabase session bootstrap
│   ├── ClientEnvValidator.tsx    # Client-side env validation
│   ├── TeacherWorkspaceProvider.tsx # Teacher workspace state
│   ├── WorkspaceContextProvider.tsx # Workspace context
│   ├── DashboardSummaryProvider.tsx # Dashboard summary state
│   ├── OfflineStatusBanner.tsx   # Offline connectivity banner
│   ├── OfflineStatusProvider.tsx # Offline state provider
│   ├── Table.tsx                 # Generic data table
│   ├── TableSearch.tsx           # Table search bar
│   ├── Pagination.tsx            # Pagination controls
│   ├── BigCalendar.tsx           # Calendar component
│   ├── EventCalendar.tsx         # Event calendar
│   ├── AttendanceChart.tsx       # Attendance visualization
│   ├── CountChart.tsx            # Count statistics chart
│   ├── FinanceChart.tsx          # Finance visualization
│   ├── Performance.tsx           # Performance metrics
│   ├── Announcements.tsx         # Announcements display
│   ├── BulkImport.tsx            # Bulk data import
│   ├── CloudflareImage.tsx       # CDN image component
│   ├── DetailPanel.tsx           # Detail slide panel
│   ├── EmptyState.tsx            # Empty state component
│   ├── Navbar.tsx                # Top navigation bar
│   ├── UserCard.tsx              # User profile card
│   ├── ProfileAvatarImage.tsx    # Avatar with CDN fallback
│   ├── ParentAttendanceSummary.tsx # Parent attendance summary
│   ├── ParentChildAttendanceTable.tsx # Per-child attendance table
│   ├── SectionPlaceholder.tsx    # Placeholder for incomplete sections
│   └── admin/                    # Admin-specific components
│   └── teacher/                  # Teacher-specific components
│   └── auth/                     # Auth-related components
│   └── payments/                 # Payment components
│   └── charts/                   # Chart components
│   └── landing/                  # Landing page components
│   └── workspace/                # Workspace components
├── lib/                          # Shared utilities
│   ├── account-profile-roles.ts  # Role management
│   ├── account-profile-client.ts # Profile client utilities
│   ├── account-state.ts          # Account state management
│   ├── account-portal-api.ts     # Account portal API client
│   ├── account-portal-auth.ts    # Account portal auth
│   ├── admin-browser-api.ts      # Admin browser API
│   ├── admin-relationship-contract.ts # Admin relationship types
│   ├── auth-routing.ts           # Role-aware route resolution
│   ├── middleware-supabase-session.ts # Server-side session verification
│   ├── csp-policy.ts             # Content Security Policy builder
│   ├── cors-policy.ts            # CORS origin validation
│   ├── edge-cache.ts             # Edge caching utilities
│   └── account-create-policy.ts  # Account creation policy
├── hooks/
│   ├── use-mobile.ts             # Mobile detection
│   └── useReveal.ts              # Scroll reveal animation
├── migrations/                   # Database migrations (001-048)
├── scripts/                      # Utility scripts
│   ├── discover-r2-public-url.mjs
│   ├── cdn-preflight.mjs
│   └── ... (load testing, audit scripts)
├── workers/                      # Edge function workers
├── cloudflare-integration/       # Cloudflare R2 integration docs
└── docs/                         # Project documentation
```

## Authentication & Authorization

### Auth Flow

1. User visits protected route -> middleware.ts intercepts
2. Middleware resolves session via `resolveVerifiedMiddlewareSession()`
3. If no session -> redirect to `/login` with `redirectTo` param
4. If session exists but must change password -> redirect to `/first-login`
5. If session exists but MFA required (aal1 + enrolled) -> redirect to `/login/mfa`
6. If session exists but wrong role for path -> redirect to role-appropriate page
7. All API routes get CORS, CSP, and cache headers applied

### Role-Based Path Access

| Role | Accessible Paths |
|------|-----------------|
| SUPER_ADMIN | /app/super-admin |
| ADMIN | /app/admin/*, /dashboard |
| PRINCIPAL | /app/admin/*, /app/principal |
| DEPUTY_HEAD | /app/admin/*, /app/deputy-head |
| BURSAR | /app/admin/*, /app/bursar, /app/payments |
| ACADEMIC_ADMIN | /app/admin/*, /app/academic-admin |
| HR_ADMIN | /app/admin/*, /app/hr-admin |
| ICT_ADMIN | /app/admin/*, /app/ict-admin |
| DISCIPLINE_ADMIN | /app/admin/*, /app/discipline-admin |
| GUIDANCE_OFFICE | /app/admin/*, /app/guidance |
| TEACHER | /teacher/* |
| STUDENT | /student/* |
| PARENT | /parent/* |
| PAYMENTS | /app/payments |

### Middleware Security Headers

- Strict-Transport-Security (HSTS) max-age=31536000
- Content-Security-Policy with nonces
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: restricted camera/mic/geolocation

## Database

### Core Tables (via migrations)

- profiles (with role, school_id, first_name, last_name)
- schools
- classes, subjects, departments, grade_levels
- academic_years, terms
- timetable_entries
- assignments, submissions
- attendance_records
- results
- grading_scales
- discipline_categories, discipline_records
- announcements
- messages
- notifications
- events
- fee_structures, student_fees, payment_transactions
- finance_records, finance_categories
- parent_students
- audit_logs
- staff_invitations, access_codes
- teaching_load_view
- relationships

All tables use RLS with school_id scoping for multi-tenant isolation.

## Components

### Shell Components

Each role gets a shell component that wraps their workspace:

- **AdminShell**: Admin/admin workspace with sidebar navigation and header
- **TeacherShell**: Teacher workspace with class/subject context
- **StudentShell**: Student portal layout
- **ParentShell**: Parent portal with child selector
- **PaymentsShell**: Payments/bursar workspace

### Shared Components

- **Table/TableSearch/Pagination**: Generic data table with search, sorting, pagination
- **BigCalendar/EventCalendar**: Calendar views for timetable and events
- **Charts**: Recharts-based AttendanceChart, CountChart, FinanceChart
- **EmptyState**: Standard empty state with illustration
- **DetailPanel**: Slide-out detail panel for record inspection
- **CloudflareImage**: Image component with R2 CDN support
- **OfflineStatusBanner**: Connectivity status indicator

## Design System

- **Framework**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Motion
- **Typography**: Inter (via next/font)
- **Colors**: Custom Tailwind theme with school branding
- **Components**: Custom-built (no UI library)

## Testing

50+ test suites across:
- API route tests (`.test.mjs` files alongside route.ts)
- Component tests
- Security tests
- Regression tests
- UI regression tests
- Performance tests

Test files use `.test.mjs` convention and are run with tsx.

## Known Issues

No critical issues reported.