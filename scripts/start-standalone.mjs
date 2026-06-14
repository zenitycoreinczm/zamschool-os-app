import { createRequire } from "node:module";
import { resolve } from "node:path";

import { assertStandaloneReady, syncStandaloneAssets } from "./prepare-standalone.mjs";

const projectRoot = process.cwd();
const prepareOnly = process.argv.includes("--prepare-only");

const result = await syncStandaloneAssets(projectRoot);
await assertStandaloneReady(projectRoot);

if (result.copied.length > 0) {
  console.log(`Prepared standalone assets: ${result.copied.join(", ")}`);
}

if (prepareOnly) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
const serverEntry = resolve(projectRoot, ".next", "standalone", "server.js");

require(serverEntry);
