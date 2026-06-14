-- Align messages.sender_id / recipient_id with auth_user_id when legacy rows stored profile.id.
-- Safe to run multiple times.

UPDATE public.messages AS m
SET sender_id = p.auth_user_id
FROM public.profiles AS p
WHERE m.school_id = p.school_id
  AND m.sender_id = p.id
  AND p.auth_user_id IS NOT NULL
  AND p.auth_user_id <> p.id;

UPDATE public.messages AS m
SET recipient_id = p.auth_user_id
FROM public.profiles AS p
WHERE m.school_id = p.school_id
  AND m.recipient_id = p.id
  AND p.auth_user_id IS NOT NULL
  AND p.auth_user_id <> p.id;

-- When profile primary key is the auth uid, ensure auth_user_id is populated for lookups.
UPDATE public.profiles
SET auth_user_id = id
WHERE auth_user_id IS NULL
  AND id IS NOT NULL;