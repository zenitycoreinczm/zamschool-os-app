import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "app", "api", "parent", "results", "route.ts");
const utilsPath = resolve(process.cwd(), "lib", "parent-route-utils.ts");

test("parent results route requires parent auth and filters to published linked-child results", async () => {
  const source = await readFile(routePath, "utf8");
  const utilsSource = await readFile(utilsPath, "utf8");

  assert.match(source, /requireParentContext/);
  assert.match(utilsSource, /parent_students/);
  assert.match(source, /published_at/);
  assert.match(source, /\.not\("published_at",\s*"is",\s*null\)/);
  assert.match(source, /applyEdgeCacheHeaders/);
  assert.match(source, /jsonResponse/);
});
