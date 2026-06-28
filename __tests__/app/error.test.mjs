import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const errorPath = resolve(process.cwd(), "app", "error.tsx");

test("app error boundary renders inside the existing document shell", async () => {
  const source = await readFile(errorPath, "utf8");

  assert.doesNotMatch(source, /<html>/);
  assert.doesNotMatch(source, /<body/);
  assert.match(source, /Try Again/);
  assert.match(source, /Return home/);
});
