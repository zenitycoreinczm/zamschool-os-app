-- Charter read-path indexes (write once, read many)

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON public.profiles(school_id, role);

CREATE INDEX IF NOT EXISTS idx_attendance_school_student_date ON public.attendance(school_id, student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_results_school_student_published ON public.results(school_id, student_id, published_at)
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_school_created ON public.announcements(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created ON public.audit_logs(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_school_user_read ON public.notifications(school_id, user_id, is_read);