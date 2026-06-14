-- Supabase Triggers for Real-time Sync to MongoDB
-- These triggers call a Postgres function that notifies the sync worker

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to notify on changes
CREATE OR REPLACE FUNCTION notify_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload = jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'old', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        'timestamp', NOW()
    );
    
    -- Notify via Supabase Realtime (clients can listen)
    PERFORM pg_notify('sync_events', payload::TEXT);
    
    -- Also queue for background sync worker
    INSERT INTO sync_queue (payload, created_at)
    VALUES (payload, NOW());
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create sync queue table
CREATE TABLE IF NOT EXISTS sync_queue (
    id SERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_processed ON sync_queue(processed, created_at);

-- Triggers for profiles table
DROP TRIGGER IF EXISTS sync_profiles ON profiles;
CREATE TRIGGER sync_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for attendance table
DROP TRIGGER IF EXISTS sync_attendance ON attendance;
CREATE TRIGGER sync_attendance
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for results table
DROP TRIGGER IF EXISTS sync_results ON results;
CREATE TRIGGER sync_results
    AFTER INSERT OR UPDATE OR DELETE ON results
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for payments table
DROP TRIGGER IF EXISTS sync_payments ON payments;
CREATE TRIGGER sync_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for announcements table
DROP TRIGGER IF EXISTS sync_announcements ON announcements;
CREATE TRIGGER sync_announcements
    AFTER INSERT OR UPDATE OR DELETE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for classes table
DROP TRIGGER IF EXISTS sync_classes ON classes;
CREATE TRIGGER sync_classes
    AFTER INSERT OR UPDATE OR DELETE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Triggers for lessons table
DROP TRIGGER IF EXISTS sync_lessons ON lessons;
CREATE TRIGGER sync_lessons
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Cleanup legacy erroneous trigger if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_timetable') THEN
        DROP TRIGGER IF EXISTS sync_timetable ON lessons;
    END IF;
END $$;

-- Triggers for assignments table
DROP TRIGGER IF EXISTS sync_assignments ON assignments;
CREATE TRIGGER sync_assignments
    AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_change();

-- Function to get attendance summary (for sync worker)
CREATE OR REPLACE FUNCTION get_attendance_summary()
RETURNS TABLE (
    student_id UUID,
    school_id UUID,
    present_count BIGINT,
    absent_count BIGINT,
    late_count BIGINT,
    excused_count BIGINT,
    total_days BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.student_id,
        a.school_id,
        COUNT(*) FILTER (WHERE a.status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE a.status = 'ABSENT') as absent_count,
        COUNT(*) FILTER (WHERE a.status = 'LATE') as late_count,
        COUNT(*) FILTER (WHERE a.status = 'EXCUSED') as excused_count,
        COUNT(*) as total_days
    FROM attendance a
    GROUP BY a.student_id, a.school_id;
END;
$$ LANGUAGE plpgsql;
