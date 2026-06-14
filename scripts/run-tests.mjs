/**
 * Project test runner: tsx loader + excludes node_modules/.next
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const SCAN_ROOTS = ["__tests__", "lib", "components", "public", "scripts", "workers"];

function listTestFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) {
      continue;
    }

    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      listTestFiles(full, files);
      continue;
    }

    if (
      entry.endsWith(".test.mjs") &&
      !entry.startsWith("_import-smoke") &&
      entry !== "standalone-start-regression.test.mjs"
    ) {
      files.push(full);
    }
  }

  return files;
}

const testFiles = SCAN_ROOTS.flatMap((dir) => {
  const full = join(ROOT, dir);
  try {
    return listTestFiles(full);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}).sort();

if (testFiles.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

console.log(`Running ${testFiles.length} test files with tsx...\n`);

const BATCH_SIZE = 8;
let failed = false;

for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
  const batch = testFiles.slice(i, i + BATCH_SIZE);
  const label = `${i + 1}-${Math.min(i + BATCH_SIZE, testFiles.length)} of ${testFiles.length}`;
  console.log(`\n--- Batch ${label} ---\n`);

  const result = spawnSync(
    process.execPath,
    [TSX, "--test", "--test-force-exit", ...batch],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    }
  );

  if (result.status !== 0) {
    failed = true;
    process.exit(result.status ?? 1);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nAll ${testFiles.length} test files passed.`);