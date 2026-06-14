-- Add missing JSONB columns to audit_logs table
-- These columns are required by the audit log insertion code in lib/audit-log.ts

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- Add index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
