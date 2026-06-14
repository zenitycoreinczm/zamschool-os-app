const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.ZAMSCHOOL_BASE_URL || "http://localhost:3004";
const TEACHER_EMAIL = process.env.ZAMSCHOOL_TEACHER_EMAIL || "demo.teacher1@gmail.com";
const TEACHER_PASSWORD = process.env.ZAMSCHOOL_TEACHER_PASSWORD || "11111111";

test.use({
  channel: "msedge",
  headless: true,
});

test("teacher live walkthrough reaches assignments and results", async ({ page }) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  await page.getByPlaceholder("name@school.com").fill(TEACHER_EMAIL);
  await page.locator('input[type="password"]').fill(TEACHER_PASSWORD);
  const authResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/auth/v1/token")
  );
  const profileResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/rest/v1/profiles")
  );
  await page.getByRole("button", { name: /login/i }).click();

  const authResponse = await authResponsePromise;
  expect(authResponse.status(), "supabase auth login should succeed").toBe(200);
  await profileResponsePromise.catch(() => null);

  await page.waitForURL(/\/teacher(?:\/|$)/, { timeout: 15000 });
  const loginError = await page.locator("text=/Invalid login credentials|Invalid email address|Password must be at least 6 characters/i").allTextContents();
  expect(loginError.join(" "), `unexpected login page state at ${page.url()}`).toBe("");
  expect(page.url(), "teacher login should redirect into the teacher workspace").toMatch(/\/teacher(?:\/|$)/);

  const assignmentsResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/teacher/assignments")
  );
  await page.goto(`${BASE_URL}/teacher/assignments`, { waitUntil: "networkidle" });
  const assignmentsResponse = await assignmentsResponsePromise;
  const assignmentsPayload = await assignmentsResponse.json();

  await expect(page.getByRole("heading", { name: "Assignments", exact: true })).toBeVisible();
  await expect(page.getByText("Loading assignments...")).toHaveCount(0);
  await expect(page.getByText(/Failed to load assignments/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Create Assignment/i }).first()).toBeVisible();
  expect(assignmentsResponse.status(), "assignments API should succeed").toBe(200);
  expect(Array.isArray(assignmentsPayload.data), "assignments payload should be an array").toBeTruthy();
  expect(assignmentsPayload.data.length, "teacher should have at least one assignment").toBeGreaterThan(0);

  const resultsResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/teacher/results")
  );
  await page.goto(`${BASE_URL}/teacher/results`, { waitUntil: "networkidle" });
  const resultsResponse = await resultsResponsePromise;
  const resultsPayload = await resultsResponse.json();

  await expect(page.getByRole("heading", { name: "Student Results", exact: true })).toBeVisible();
  await expect(page.getByText("Loading results...")).toHaveCount(0);
  await expect(page.getByText(/Failed to load results/i)).toHaveCount(0);
  expect(resultsResponse.status(), "results API should succeed").toBe(200);
  expect(Array.isArray(resultsPayload.data), "results payload should be an array").toBeTruthy();
  expect(resultsPayload.data.length, "teacher should have seeded results").toBe(3);
  await expect(page.locator("tbody tr")).toHaveCount(3);
});
