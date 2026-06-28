/**
 * Prepares the Next.js standalone build for deployment.
 *
 * `output: "standalone"` (see next.config.ts) emits a self-contained server
 * at `.next/standalone/server.js` but does NOT copy `public/` or
 * `.next/static/` into it. This script synchronizes those assets so the
 * standalone server can serve static files and public assets correctly.
 *
 * Used by:
 *   - package.json `postbuild` / `prestart` (run directly)
 *   - scripts/start-standalone.mjs (imported)
 */
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Copy `public/` and `.next/static/` into the standalone output directory.
 * Idempotent and safe to run repeatedly.
 */
export function syncStandaloneAssets(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const standaloneDir = resolve(root, ".next", "standalone");
  const copied = [];

  if (!existsSync(standaloneDir)) {
    return { copied };
  }

  const publicDir = resolve(root, "public");
  if (existsSync(publicDir)) {
    const destPublic = resolve(standaloneDir, "public");
    cpSync(publicDir, destPublic, { recursive: true });
    copied.push("public");
  }

  const staticDir = resolve(root, ".next", "static");
  if (existsSync(staticDir)) {
    const destStatic = resolve(standaloneDir, ".next", "static");
    mkdirSync(resolve(standaloneDir, ".next"), { recursive: true });
    cpSync(staticDir, destStatic, { recursive: true });
    copied.push(".next/static");
  }

  return { copied };
}

/**
 * Verify the standalone server entry exists before attempting to start it.
 */
export function assertStandaloneReady(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const serverEntry = resolve(root, ".next", "standalone", "server.js");
  if (!existsSync(serverEntry)) {
    throw new Error(
      `Standalone server not found at ${serverEntry}. Run \`npm run build\` first (next.config.ts uses output: "standalone").`,
    );
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (isMain) {
  const root = process.cwd();
  const result = syncStandaloneAssets(root);
  assertStandaloneReady(root);
  if (result.copied.length > 0) {
    console.log(`[prepare-standalone] Synced: ${result.copied.join(", ")}`);
  } else {
    console.log("[prepare-standalone] No static assets to sync.");
  }
}
