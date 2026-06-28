/**
 * Project test runner: tsx loader + excludes node_modules/.next
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const SCAN_ROOTS = ["__tests__", "lib", "components", "public", "scripts"];
const GATEWAY_TEST_DIR = join(ROOT, "workers", "gateway");

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

function listGatewayTestFiles() {
  const srcDir = join(GATEWAY_TEST_DIR, "src");
  try {
    return readdirSync(srcDir)
      .filter((entry) => entry.endsWith(".test.mjs"))
      .map((entry) => join(srcDir, entry))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function runNodeTest(label, testFiles, { cwd = ROOT, env = process.env } = {}) {
  console.log(`\n--- ${label} ---\n`);

  const result = spawnSync(
    process.execPath,
    ["--test", "--test-force-exit", ...testFiles],
    {
      stdio: "inherit",
      cwd,
      env,
    },
  );

  return result.status ?? 1;
}

function runTsxTestBatch(label, testFiles) {
  console.log(`\n--- ${label} ---\n`);

  const result = spawnSync(
    process.execPath,
    [TSX, "--test", "--test-force-exit", ...testFiles],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    },
  );

  return result.status ?? 1;
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

const gatewayTestFiles = listGatewayTestFiles();
const totalCount = testFiles.length + gatewayTestFiles.length;

if (totalCount === 0) {
  console.error("No test files found.");
  process.exit(1);
}

console.log(
  `Running ${totalCount} test files (${testFiles.length} app + ${gatewayTestFiles.length} gateway)...\n`,
);

if (gatewayTestFiles.length > 0) {
  const gatewayStatus = runNodeTest("Gateway worker tests", gatewayTestFiles, {
    cwd: GATEWAY_TEST_DIR,
    env: {
      ...process.env,
      NODE_ENV: "test",
      ALLOW_INSECURE_JWT_DECODE: "",
      JWT_VERIFY_MODE: "signature",
    },
  });

  if (gatewayStatus !== 0) {
    process.exit(gatewayStatus);
  }
}

const BATCH_SIZE = 8;

for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
  const batch = testFiles.slice(i, i + BATCH_SIZE);
  const label = `App batch ${i + 1}-${Math.min(i + BATCH_SIZE, testFiles.length)} of ${testFiles.length}`;
  const status = runTsxTestBatch(label, batch);
  if (status !== 0) {
    process.exit(status);
  }
}

console.log(`\nAll ${totalCount} test files passed.`);
