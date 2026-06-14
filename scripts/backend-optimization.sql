-- ZamSchool OS Backend Optimization & Security Hardening Script
-- 1. Security Audit: Remove Dangerous Functions
-- The exec_sql function is a massive security risk (SQL Injection by design).
DROP FUNCTION IF EXISTS exec_sql(TEXT);

-- 2. RLS Hardening: Specific Table Policies
-- Current policies are too broad. Let's refine them.

-- Fix get_my_school_id to use auth.uid() correctly
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Restrict access
DROP POLICY IF EXISTS profile_isolation_policy ON profiles;
DROP POLICY IF EXISTS admin_manage_all ON profiles;

CREATE POLICY profile_select_policy ON profiles
    FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY admin_manage_profiles ON profiles
    FOR ALL USING (
        school_id = get_my_school_id() AND 
        (SELECT role FROM profiles WHERE auth_user_id = auth.uid()) = 'ADMIN'
    );

-- Attendance: Teachers can manage, students/parents can only view their own
CREATE POLICY teacher_manage_attendance ON attendance
    FOR ALL USING (
        school_id = get_my_school_id() AND 
        get_my_role() = 'TEACHER'
    );

CREATE POLICY student_view_own_attendance ON attendance
    FOR SELECT USING (
        student_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

-- Results: Same logic as attendance
CREATE POLICY teacher_manage_results ON results
    FOR ALL USING (
        school_id = get_my_school_id() AND 
        get_my_role() = 'TEACHER'
    );

CREATE POLICY student_view_own_results ON results
    FOR SELECT USING (
        student_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

-- 3. Performance Optimization: Missing Indexes
-- Speed up common joins and filtered queries for millisecond response times.

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON profiles(school_id, role);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student_subject ON results(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_school_day ON lessons(school_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, is_read);

-- 4. Token Efficiency: Optimized JSONB queries
-- Use GIN index for audit logs to avoid full table scans on JSON data.
CREATE INDEX IF NOT EXISTS idx_audit_logs_data ON audit_logs USING GIN (new_data);

-- 5. Automated Workflows (DTCM)
-- Auto-create notifications on attendance status change
CREATE OR REPLACE FUNCTION notify_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR OLD.status <> NEW.status) THEN
        INSERT INTO notifications (school_id, user_id, title, message, type)
        VALUES (
            NEW.school_id,
            NEW.student_id,
            'Attendance Updated',
            'Your attendance for ' || NEW.date || ' has been marked as ' || NEW.status,
            'info'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_attendance_notification ON attendance;
CREATE TRIGGER tr_attendance_notification
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION notify_attendance_change();

-- 6. Rate Limiting Helper (DB Level)
-- Store last request timestamp to prevent rapid succession hits at the DB level
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_api_request TIMESTAMP WITH TIME ZONE;
