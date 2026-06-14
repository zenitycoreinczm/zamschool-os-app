import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const redisUrl = process.argv[2];

if (!redisUrl) {
  console.error("Usage: node scripts/set-redis-env.mjs <REDIS_URL>");
  process.exit(1);
}

let content = readFileSync(envPath, "utf8");
if (/^REDIS_URL=/m.test(content)) {
  content = content.replace(/^REDIS_URL=.*$/m, `REDIS_URL=${redisUrl}`);
} else {
  content += `\nREDIS_URL=${redisUrl}\n`;
}

writeFileSync(envPath, content);
console.log("REDIS_URL saved to .env.local");