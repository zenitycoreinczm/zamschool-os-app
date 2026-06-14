-- Remove leftover test table and duplicate indexes/constraints flagged by Supabase advisors.
-- Keeps one index/constraint per equivalent column set; prefers *_id naming and constraint-backed uniques.

-- Test scratch table (no PK, no data, unused)
DROP TABLE IF EXISTS public.test_alter;

-- activity_logs
DROP INDEX IF EXISTS public.activity_logs_school_created_at_idx;

-- announcement_seen
DROP INDEX IF EXISTS public.idx_announcement_seen_announcement;
DROP INDEX IF EXISTS public.idx_announcement_seen_profile;
ALTER TABLE public.announcement_seen DROP CONSTRAINT IF EXISTS announcement_seen_unique;
DROP INDEX IF EXISTS public.announcement_seen_unique_idx;

-- announcements
DROP INDEX IF EXISTS public.idx_announcements_school;

-- assignments
DROP INDEX IF EXISTS public.idx_assignments_school;
DROP INDEX IF EXISTS public.idx_assignments_teacher;

-- attendance
DROP INDEX IF EXISTS public.idx_attendance_school;
DROP INDEX IF EXISTS public.idx_attendance_student;
DROP INDEX IF EXISTS public.attendance_unique_idx;

-- audit_logs
DROP INDEX IF EXISTS public.idx_audit_logs_school_created;

-- class_subjects
ALTER TABLE public.class_subjects DROP CONSTRAINT IF EXISTS class_subjects_unique;
DROP INDEX IF EXISTS public.class_subjects_unique_idx;

-- classes
DROP INDEX IF EXISTS public.classes_school_name_unique_idx;

-- events
DROP INDEX IF EXISTS public.idx_events_date;
DROP INDEX IF EXISTS public.idx_events_school;

-- exam_questions
DROP INDEX IF EXISTS public.exam_questions_exam_idx;
DROP INDEX IF EXISTS public.exam_questions_school_idx;

-- exam_submission_answers
DROP INDEX IF EXISTS public.exam_submission_answers_submission_idx;

-- exam_submissions
DROP INDEX IF EXISTS public.exam_submissions_school_idx;
DROP INDEX IF EXISTS public.exam_submissions_student_idx;

-- exams
DROP INDEX IF EXISTS public.idx_exams_class;
DROP INDEX IF EXISTS public.idx_exams_date;
DROP INDEX IF EXISTS public.idx_exams_school;

-- fee_payments
DROP INDEX IF EXISTS public.idx_fee_payments_parent;
DROP INDEX IF EXISTS public.idx_fee_payments_school;
DROP INDEX IF EXISTS public.idx_fee_payments_student;

-- finances
DROP INDEX IF EXISTS public.idx_finances_school;

-- lessons
DROP INDEX IF EXISTS public.idx_lessons_class;
DROP INDEX IF EXISTS public.idx_lessons_school;
DROP INDEX IF EXISTS public.idx_lessons_teacher;

-- messages
DROP INDEX IF EXISTS public.idx_messages_receiver;
DROP INDEX IF EXISTS public.idx_messages_receiver_read_created;
DROP INDEX IF EXISTS public.idx_messages_school;
DROP INDEX IF EXISTS public.idx_messages_sender;

-- parent_students
DROP INDEX IF EXISTS public.idx_parent_students_parent;
DROP INDEX IF EXISTS public.idx_parent_students_student;
ALTER TABLE public.parent_students DROP CONSTRAINT IF EXISTS parent_students_unique;
DROP INDEX IF EXISTS public.parent_students_unique_idx;

-- parents
DROP INDEX IF EXISTS public.idx_parents_profile;
DROP INDEX IF EXISTS public.idx_parents_school;

-- profiles
DROP INDEX IF EXISTS public.idx_profiles_school;

-- report_card_reviews
DROP INDEX IF EXISTS public.idx_report_review_lookup;

-- results
DROP INDEX IF EXISTS public.idx_results_exam;
DROP INDEX IF EXISTS public.idx_results_school;
DROP INDEX IF EXISTS public.idx_results_student;
DROP INDEX IF EXISTS public.results_exam_unique_idx;
DROP INDEX IF EXISTS public.results_assignment_unique_idx;

-- school_invites
DROP INDEX IF EXISTS public.idx_school_invites_code;

-- schools
DROP INDEX IF EXISTS public.idx_schools_code;

-- students
DROP INDEX IF EXISTS public.idx_students_class;
DROP INDEX IF EXISTS public.idx_students_profile;
DROP INDEX IF EXISTS public.idx_students_school;

-- subjects
DROP INDEX IF EXISTS public.subjects_school_code_unique_idx;

-- teachers
DROP INDEX IF EXISTS public.idx_teachers_profile;
DROP INDEX IF EXISTS public.idx_teachers_school;