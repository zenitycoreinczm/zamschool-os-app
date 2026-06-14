-- Public bucket for optimized profile avatars (WebP, ~32KB server-side cap).
-- Path: {school_id}/{user_id}/avatar.webp

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  65536,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (bucket is public; objects are world-readable).
DROP POLICY IF EXISTS "profile_avatars_public_read" ON storage.objects;
CREATE POLICY "profile_avatars_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- Authenticated users manage only their own avatar object.
DROP POLICY IF EXISTS "profile_avatars_insert_own" ON storage.objects;
CREATE POLICY "profile_avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND (storage.foldername(name))[1] = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "profile_avatars_update_own" ON storage.objects;
CREATE POLICY "profile_avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND (storage.foldername(name))[1] = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "profile_avatars_delete_own" ON storage.objects;
CREATE POLICY "profile_avatars_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);