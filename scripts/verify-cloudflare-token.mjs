/**
 * Verify CF_API_TOKEN and list R2 buckets / public domain status.
 * Usage: node --env-file=.env.local scripts/verify-cloudflare-token.mjs
 */
import 'dotenv/config';

const accountId = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;

if (!accountId || !token) {
  console.error('Missing CF_ACCOUNT_ID or CF_API_TOKEN');
  process.exit(1);
}

async function api(path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const verify = await api('/user/tokens/verify');
console.log('Token verify:', verify.status, verify.json.success ? 'OK' : verify.json.errors?.[0]?.message || verify.json);

const buckets = await api(`/accounts/${accountId}/r2/buckets`);
if (buckets.json.success) {
  const names = (buckets.json.result?.buckets || []).map((b) => b.name);
  console.log('R2 buckets:', names.join(', ') || '(none)');
} else {
  console.log('R2 list:', buckets.status, buckets.json.errors?.[0]?.message || buckets.json);
}

const bucket = process.env.R2_ASSETS_BUCKET || 'zamschool-assets';
const managed = await api(`/accounts/${accountId}/r2/buckets/${bucket}/domains/managed`);
if (managed.json.success) {
  const r = managed.json.result;
  console.log(`Public dev URL (${bucket}):`, r?.enabled ? r.domain || r.url : 'not enabled');
} else {
  console.log('Managed domain:', managed.status, managed.json.errors?.[0]?.message);
}