import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const componentPath = resolve(process.cwd(), "components", "workspace", "WorkspaceGlobalSearch.tsx");

test("workspace global search loads remote matches from the account search API", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /\/api\/account\/workspace-search/);
  assert.match(source, /groupWorkspaceSearchResults/);
  assert.match(source, /WORKSPACE_SEARCH_MIN_QUERY/);
  assert.match(source, /ws\.popover/);
});