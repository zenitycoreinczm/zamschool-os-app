/**
 * Week 5 CDN preflight: validate R2 public URL pairing before deploy.
 * Usage: node node_modules/tsx/dist/cli.mjs scripts/cdn-preflight.mjs
 *        npm run cdn:preflight  (with --env-file=.env.local)
 */
import { importTsModule } from "./test-ts-module.mjs";

const { validateR2CdnConfig, isR2CdnConfigured } = await importTsModule(
  "../lib/r2-config.ts",
  import.meta.url
);

const validation = validateR2CdnConfig();

console.log("=== ZamSchool CDN preflight ===\n");
console.log(`Delivery mode: ${validation.deliveryMode}`);
console.log(`R2 CDN configured: ${isR2CdnConfigured() ? "yes" : "no (app proxy fallback)"}\n`);

if (validation.issues.length) {
  console.log("Issues:");
  for (const issue of validation.issues) {
    console.log(`  - ${issue}`);
  }
  console.log("");
}

if (!validation.ok) {
  console.error("CDN preflight failed. Fix env vars before production deploy.");
  process.exit(1);
}

if (validation.deliveryMode === "proxy") {
  console.warn(
    "Warning: R2_PUBLIC_URL is unset. Production should use pub-*.r2.dev (see docs/CDN_AND_R2.md)."
  );
}

console.log("CDN preflight OK.");
process.exit(0);