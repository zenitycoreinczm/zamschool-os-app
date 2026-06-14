/**
 * One-time maintainer script: convert static .ts imports in *.test.mjs
 * to importTsModule() for compatibility with tsx + node:test.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["__tests__", "lib", "components", "public", "scripts", "workers"];

const IMPORT_RE =
  /import\s+(?:type\s+)?{([\s\S]*?)}\s+from\s+["'](\.\/[^"']+\.ts)["'];?\s*\n/g;

function listTestFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      listTestFiles(full, files);
      continue;
    }
    if (entry.endsWith(".test.mjs")) {
      files.push(full);
    }
  }
  return files;
}

function helperImportPath(testFile) {
  const rel = relative(dirname(testFile), join(ROOT, "scripts", "test-ts-module.mjs")).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function patchSource(source, testFile) {
  const matches = [...source.matchAll(IMPORT_RE)];
  if (matches.length === 0) {
    return null;
  }

  if (source.includes("importTsModule")) {
    return null;
  }

  let next = source;
  const dynamicLoads = [];
  const helperPath = helperImportPath(testFile);

  for (const match of matches) {
    next = next.replace(match[0], "");
    const bindings = match[1].trim();
    const modulePath = match[2];
    dynamicLoads.push(
      `const { ${bindings} } = await importTsModule("${modulePath}", import.meta.url);`
    );
  }

  const header = `import { importTsModule } from "${helperPath}";\n\n`;
  const loads = `${dynamicLoads.join("\n")}\n\n`;

  const firstImport = next.search(/^import\s/m);
  if (firstImport === -1) {
    return `${header}${loads}${next}`;
  }

  const before = next.slice(0, firstImport);
  const after = next.slice(firstImport);
  return `${before}${header}${loads}${after}`;
}

let patched = 0;
for (const dir of SCAN_ROOTS) {
  const base = join(ROOT, dir);
  try {
    for (const file of listTestFiles(base)) {
      const source = readFileSync(file, "utf8");
      const updated = patchSource(source, file);
      if (!updated) continue;
      writeFileSync(file, updated, "utf8");
      patched += 1;
      console.log(`patched ${relative(ROOT, file)}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

console.log(`\nPatched ${patched} test files.`);