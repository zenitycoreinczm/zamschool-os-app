/**
 * Discover R2_PUBLIC_URL for zamschool-assets (r2.dev or custom domain).
 *
 * Prerequisites for Cloudflare API:
 *   - CF_API_TOKEN with Account → R2 → Read (or Admin)
 *   - Token IP allowlist must include this machine (or no IP filter)
 *
 * Usage:
 *   node --env-file=.env.local scripts/discover-r2-public-url.mjs
 *
 * On success, prints R2_PUBLIC_URL / NEXT_PUBLIC_R2_PUBLIC_URL lines for .env.local.
 */
import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
const bucket = process.env.R2_ASSETS_BUCKET || 'zamschool-assets';

if (!accountId || !token) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN in .env.local');
  process.exit(1);
}

async function cfGet(path) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

function pickPublicBase(managed, customList) {
  const customEnabled = (customList || []).find(
    (d) => d?.enabled && (d?.domain || d?.hostname)
  );
  if (customEnabled) {
    const host = customEnabled.domain || customEnabled.hostname;
    return `https://${host}`;
  }

  const managedDomain = managed?.domain || managed?.url;
  if (managed?.enabled && managedDomain) {
    const base = managedDomain.startsWith('http')
      ? managedDomain
      : `https://${managedDomain}`;
    return base.replace(/\/+$/, '');
  }

  return null;
}

console.log(`Bucket: ${bucket}`);
console.log(`Account: ${accountId}\n`);

const managed = await cfGet(`/r2/buckets/${bucket}/domains/managed`);
const custom = await cfGet(`/r2/buckets/${bucket}/domains/custom`);

if (!managed.ok) {
  const msg = managed.json?.errors?.[0]?.message || `HTTP ${managed.status}`;
  console.error(`Cloudflare API failed (managed domain): ${msg}`);
  console.error('\nFix token permissions (R2 Read) and IP allowlist, or copy the URL from:');
  console.error('  Dashboard → R2 → zamschool-assets → Settings → Public Development URL');
  process.exit(1);
}

const publicBase = pickPublicBase(managed.json?.result, custom.json?.result);
if (!publicBase) {
  console.error('No public URL is configured for this bucket.');
  console.error('Enable: R2 → zamschool-assets → Settings → Public Development URL → Enable');
  console.error('Or connect a custom domain under Custom Domains.');
  process.exit(1);
}

console.log('Public access: enabled');
console.log(`R2_PUBLIC_URL=${publicBase}`);
console.log(`NEXT_PUBLIC_R2_PUBLIC_URL=${publicBase}`);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
const key = list.Contents?.[0]?.Key;
if (key) {
  const testUrl = `${publicBase}/${key}`;
  const head = await fetch(testUrl, { method: 'HEAD', redirect: 'follow' });
  console.log(`\nVerify HEAD ${key}: HTTP ${head.status}`);
  if (!head.ok) {
    console.warn('Public URL is set in Cloudflare but object is not reachable yet (propagation or wrong bucket).');
  }
}