# Supabase Security

## Overview

ZamSchool OS uses Supabase for database, authentication, and real-time functionality. Security is enforced at multiple layers.

## RLS (Row Level Security)

RLS is enabled on all production tables with policies scoped to:
- **Role**: Each policy checks the user's role from `auth.jwt()`
- **School**: Each policy scopes data to the user's `school_id`
- **Ownership**: Personal data is scoped to `user_id`

### Policy Types
- **SELECT**: Users can read data they own or have permission to view
- **INSERT**: Users can create data within their role/school scope
- **UPDATE**: Users can modify data they own or manage
- **DELETE**: Users can delete data if authorized

### RLS Hardening

48 migrations include extensive RLS hardening:
- Helper functions for role checks
- Recursive policy prevention (multiple fix migrations)
- All tables covered (profiles, classes, subjects, assignments, attendance, results, finance, payments, messages, notifications, etc.)

## Authentication

### Supabase Auth
- Email/password authentication
- JWT session tokens
- Session refresh via Supabase SSR

### MFA (Multi-Factor Authentication)
- TOTP-based using authenticator apps
- Enrollment: `/api/auth/mfa/enroll`
- Challenge: `/api/auth/mfa/challenge`
- Verify: `/api/auth/mfa/verify`
- List/delete factors: `/api/auth/mfa/factors`
- Enforced for elevated roles when aal1 session detected

### Password Policy
- First login requires password change (`/first-login`)
- Temporary passwords expire
- Password reset flow via email

## Service Role Protection

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must be protected:
- Used only in server-side API routes (`/app/api/*`)
- Never exposed to client-side code
- All service role operations include school_id validation
- Tenant isolation audit script (`npm run audit:tenant`) verifies no cross-tenant leaks

## Real-time Security

- Real-time subscriptions are authenticated via JWT
- RLS policies apply to real-time data
- Sync triggers log message/notification delivery
- Rate limiting prevents subscription abuse

## Audit Trail

All critical actions are logged to `audit_logs`:
- User identity (user_id, role)
- Action type and details
- IP address and timestamp
- School context (school_id)
- Immutable (INSERT-only policy)