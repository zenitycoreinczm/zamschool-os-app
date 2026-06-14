-- Make profile avatars private: no anonymous/public reads; school-scoped authenticated read.

UPDATE storage.buckets
SET public = false
WHERE id = 'profile-avatars';

DROP POLICY IF EXISTS "profile_avatars_public_read" ON storage.objects;

DROP POLICY IF EXISTS "profile_avatars_select_same_school" ON storage.objects;
CREATE POLICY "profile_avatars_select_same_school"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (
    SELECT school_id::text
    FROM public.profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
    LIMIT 1
  )
);