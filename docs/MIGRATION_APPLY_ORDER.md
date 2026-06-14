# Migration Apply Order

Apply migrations in the order listed below. Each migration is sequential and must be applied exactly once.

| # | File | Purpose |
|---|------|---------|
| 001 | `001_add_name_columns.sql` | Add first_name/last_name to profiles |
| 002 | `002_complete_schema_update.sql` | School_id columns + core tables + RLS + indexes |
| 003 | `003_add_payments_role.sql` | Add payments role, triggers, payment_summaries view |
| 004 | `004_add_notification_dedupe_key.sql` | Dedupe_key column + unique index |
| 005 | `005_add_profile_first_login_flags.sql` | Must_change_password + temporary_password_issued_at |
| 006 | `006_repair_attendance_rollcall_constraint.sql` | Fix attendance unique constraint |
| 007 | `007_add_notifications_dedupe_constraint.sql` | Replace dedupe index with constraint |
| 008 | `008_add_result_publish_columns.sql` | Published_at/published_by on results |
| 009 | `009_sync_triggers.sql` | Real-time sync triggers (pg_net, sync_queue) |
| 010 | `010_harden_rls_policies.sql` | Major RLS hardening: helpers + policies on ALL tables |
| 011 | `011_cleanup_legacy_rls_policies.sql` | Drop disallowed policies, recreate audit_logs |
| 012 | `012_ensure_profiles_columns.sql` | Ensure profiles columns exist |
| 013 | `013_add_audit_logs_policy.sql` | Audit logs RLS policy |
| 014 | `014_fix_teacher_students.sql` | Fix teacher_students RLS |
| 015 | `015_fix_auth_users.sql` | Fix auth users access |
| 016 | `016_allow_class_teachers_to_view_own_students.sql` | Class teacher student visibility |
| 017 | `017_fix_class_teachers_view_students.sql` | Fix class teacher student view |
| 018 | `018_relationship_names.sql` | Relationship name support |
| 019 | `019_payments_policies.sql` | Payments table RLS policies |
| 020 | `020_teaching_load_view.sql` | Teaching load view |
| 021 | `021_migrate_teaching_load_view.sql` | Migrate teaching load view |
| 022 | `022_academic_year_auth.sql` | Academic year auth policies |
| 023 | `023_add_missing_policies.sql` | Missing RLS policies |
| 024 | `024_add_school_id_to_messages.sql` | School_id to messages |
| 025 | `025_recreate_teaching_load_view.sql` | Recreate teaching load view |
| 026 | `026_fix_departments_policy.sql` | Fix departments RLS |
| 027 | `027_fix_events_policy_dml.sql` | Fix events DML policies |
| 028 | `028_fix_payments_billing_policy.sql` | Fix payments billing RLS |
| 029 | `029_fix_student_fees_policy.sql` | Fix student fees RLS |
| 030 | `030_finance_categories.sql` | Finance categories support |
| 031 | `031_add_archive_triggers.sql` | Archive triggers |
| 032 | `032_add_messages_sync_trigger.sql` | Messages sync trigger |
| 033 | `033_add_class_teacher_assignment_table.sql` | Class teacher assignment table |
| 034 | `034_result_completeness_function.sql` | Result completeness function |
| 035 | `035_fix_infinite_recursion_rls.sql` | Fix infinite recursion in RLS |
| 036 | `036_fix_discipline_rls_recursion.sql` | Fix discipline RLS recursion |
| 037 | `037_missing_notifications_policy.sql` | Missing notifications RLS |
| 038 | `038_fix_messages_policy_v2.sql` | Fix messages RLS v2 |
| 039 | `039_unified_dashboard_summary.sql` | Unified dashboard summary function |
| 040 | `040_fix_dashboard_summary_rls.sql` | Fix dashboard summary RLS |
| 041 | `041_fix_student_class_view.sql` | Fix student class view |
| 042 | `042_add_parent_child_policies.sql` | Parent-child RLS policies |
| 043 | `043_discipline_policies.sql` | Discipline table RLS |
| 044 | `044_parent_absence_policy.sql` | Parent absence reporting RLS |
| 045 | `045_fix_certificate_rls.sql` | Fix certificate RLS |
| 046 | `046_fix_unread_summary.sql` | Fix unread summary function |
| 047 | `047_add_workspace_context.sql` | Workspace context support |
| 048 | `048_fix_realtime_subscription.sql` | Fix realtime subscription |

## How to Apply

1. Connect to your Supabase project's SQL Editor.
2. Copy the contents of each migration file in order.
3. Execute each migration and verify no errors before proceeding to the next.
4. Some migrations depend on previous ones - do not skip or reorder.

## Rollback

Rollbacks are not automated. To revert a migration, restore from a database backup taken before the migration was applied.