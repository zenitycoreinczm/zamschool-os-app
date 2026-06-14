/**
 * Run wrangler with CLOUDFLARE_API_TOKEN from .env.local (CF_API_TOKEN).
 * Usage: node --env-file=.env.local scripts/run-wrangler-with-env.mjs -- r2 bucket list
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args[0] === '--') args.shift();

const token = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('Set CF_API_TOKEN in .env.local');
  process.exit(1);
}

const gatewayDir = resolve(root, 'workers', 'gateway');
const result = spawnSync('npx', ['wrangler', ...args], {
  cwd: gatewayDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID,
  },
});

process.exit(result.status ?? 1);