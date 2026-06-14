import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {
  ...readEnvFile(path.resolve(".env.local")),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase service role env is missing from .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grades'
  ) THEN
    CREATE TABLE public.grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'grade_id'
  ) THEN
    ALTER TABLE public.classes
      ADD COLUMN grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'temporary_password_issued_at'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN temporary_password_issued_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN event_date DATE;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_date'
    ) THEN
      UPDATE public.events
      SET event_date = COALESCE(event_date, start_date::date)
      WHERE start_date IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN start_time TIME;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_date'
    ) THEN
      UPDATE public.events
      SET start_time = COALESCE(start_time, start_date::time)
      WHERE start_date IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN end_time TIME;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'end_date'
    ) THEN
      UPDATE public.events
      SET end_time = COALESCE(end_time, end_date::time)
      WHERE end_date IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'target_role'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN target_role TEXT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'audience'
    ) THEN
      UPDATE public.events
      SET target_role = CASE
        WHEN LOWER(COALESCE(audience, '')) = 'all' THEN NULL
        WHEN audience IS NULL THEN NULL
        ELSE UPPER(audience)
      END
      WHERE audience IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'target_class_id'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_role'
  ) THEN
    ALTER TABLE public.announcements
      ADD COLUMN target_role TEXT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'audience'
    ) THEN
      UPDATE public.announcements
      SET target_role = CASE
        WHEN LOWER(COALESCE(audience, '')) = 'all' THEN NULL
        WHEN audience IS NULL THEN NULL
        ELSE UPPER(audience)
      END
      WHERE audience IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_class_id'
  ) THEN
    ALTER TABLE public.announcements
      ADD COLUMN target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.announcements
      ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.announcements
      ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'dedupe_key'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN dedupe_key TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grades_school_id ON public.grades(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_id ON public.classes(grade_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_school_dedupe_key
  ON public.notifications(school_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
`;

async function main() {
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    throw error;
  }
  console.log("Migration applied");
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    values[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
