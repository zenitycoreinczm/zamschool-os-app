import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cardFiles = [
  "components/AttendanceChart.tsx",
  "components/CountChart.tsx",
  "components/Announcements.tsx",
  "components/FinanceChart.tsx",
];

test("dashboard cards do not misuse h1 tag for card titles", () => {
  for (const file of cardFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /<h1\s+className=[^>]*>\s*(Attendance|Students|Announcements|Payments)\s*<\/h1>/i,
      `${file} should use h2 or h3 instead of h1 for card title`,
    );
    assert.match(
      source,
      /<h2\s+className=[^>]*>\s*(Attendance|Students|Announcements|Payments)\s*<\/h2>/i,
      `${file} should use h2 for card title`,
    );
  }
});
