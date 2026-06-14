#!/usr/bin/env bash
set -euo pipefail

# Read env vars
export $(grep -E '^(SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)=' C:/Zamschool-main/.env.local | head -2 | xargs)

echo "=== Upload test ==="
curl -s -X POST "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/object/profile-avatars/test/upload-test/test.webp" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/webp" \
  -H "x-upsert: true" \
  --data-binary "test"

echo ""
echo "=== List test ==="
curl -s -X GET "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/object/list/profile-avatars/test/upload-test" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

echo ""
echo "=== Download test ==="
curl -s -o /dev/null -w "%{http_code}" -X GET "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/object/profile-avatars/test/upload-test/test.webp" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "=== Cleanup ==="
curl -s -X DELETE "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/object/profile-avatars/test/upload-test/test.webp" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
