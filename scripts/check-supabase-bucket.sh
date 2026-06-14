#!/usr/bin/env bash
set -euo pipefail

SRK=$(grep SUPABASE_SERVICE_ROLE_KEY C:/Zamschool-main/.env.local | head -1 | cut -d= -f2-)
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY C:/Zamschool-main/.env.local | head -1 | cut -d= -f2-)

# Check bucket policies
curl -s "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/bucket/profile-avatars" \
  -H "Authorization: Bearer $SRK" \
  -H "apikey: $ANON" 2>/dev/null

echo "---"

# Check storage policies
curl -s "https://jnnroitaftfmclegbeac.supabase.co/rest/v1/rpc/check_storage_policies" 2>/dev/null || echo "no rpc"

echo "---"

# List objects in bucket
curl -s "https://jnnroitaftfmclegbeac.supabase.co/storage/v1/object/list/profile-avatars" \
  -H "Authorization: Bearer $SRK" \
  -H "apikey: $ANON" 2>/dev/null
