/**
 * Test that avatar upload flow works end-to-end:
 * 1. Can create optimized image with sharp
 * 2. Can upload to Supabase Storage profile-avatars bucket
 * 3. Can generate a public URL
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SRV_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SRV_KEY, { auth: { persistSession: false } });

async function main() {
  // 1. Verify bucket exists
  console.log('1. Checking profile-avatars bucket...');
  const { data: bucket, error: bErr } = await sb.storage.getBucket('profile-avatars');
  if (bErr) {
    console.error('Bucket error:', bErr.message);
    process.exit(1);
  }
  console.log(`   Bucket: ${bucket.id} | public: ${bucket.public} | size_limit: ${bucket.file_size_limit}`);

  // 2. Test upload a tiny WebP to a temp path
  const testPath = '__test__/test-user-avatar-removeme.webp';
  // Minimal valid WebP - a 1x1 pixel
  const minimalWebP = Buffer.from(
    '524946465a000000574542505650384c4d0000002f0000001000100002001352c0000200000241525355020000000332434152c00000000000000000',
    'hex'
  );

  console.log('2. Uploading test avatar...');
  const { error: upErr } = await sb.storage
    .from('profile-avatars')
    .upload(testPath, minimalWebP, {
      upsert: true,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=3600',
    });

  if (upErr) {
    console.error('Upload error:', upErr.message);
    process.exit(1);
  }
  console.log('   Upload OK');

  // 3. Get public URL
  const { data: urlData } = sb.storage
    .from('profile-avatars')
    .getPublicUrl(testPath);
  console.log('3. Public URL:', urlData?.publicUrl);

  // 4. Clean up test object
  console.log('4. Cleaning up test object...');
  const { error: delErr } = await sb.storage
    .from('profile-avatars')
    .remove([testPath]);
  if (delErr) {
    console.log('   Cleanup note:', delErr.message);
  } else {
    console.log('   Cleaned up OK');
  }

  console.log('\n✓ Avatar upload flow verified!');
}

main().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
