DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'results'
          AND column_name = 'published_at'
    ) THEN
        ALTER TABLE public.results
            ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'results'
          AND column_name = 'published_by'
    ) THEN
        ALTER TABLE public.results
            ADD COLUMN published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
