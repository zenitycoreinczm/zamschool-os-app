import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shellFiles = [
  "components/ParentShell.tsx",
  "components/PaymentsShell.tsx",
  "components/StudentShell.tsx",
  "components/TeacherShell.tsx",
];

test("shells use the unified getDisplayInitials helper instead of single character slices", () => {
  for (const file of shellFiles) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /getDisplayInitials/g,
      `${file} should import and use getDisplayInitials helper`,
    );
    assert.doesNotMatch(
      source,
      /fallback=\{displayName\.slice\(0,\s*1\)\.toUpperCase\(\)\}/,
      `${file} should not use ad-hoc single-character fallback for avatar images`,
    );
    assert.doesNotMatch(
      source,
      /:\s*displayName\.slice\(0,\s*1\)\.toUpperCase\(\)/,
      `${file} should not use ad-hoc single-character fallback as direct content when avatarUrl is missing`,
    );
  }
});
