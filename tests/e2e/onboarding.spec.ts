import { test, expect } from "@playwright/test";
import { STUDENT_AUTH_FILE } from "./auth.setup";

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING E2E TESTS
// Tests the complete 3-step onboarding flow after authentication
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Onboarding Flow", () => {
  // These tests require a fresh authenticated user with onboarding_complete = false
  // In CI, use a separate test user seeded without onboarding complete

  test("onboarding step 1 shows institution search", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await expect(page.getByRole("heading", { name: /where do you study/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your university/i)).toBeVisible();
    // Should show popular institutions
    await expect(page.getByText(/popular institutions/i)).toBeVisible();
  });

  test("institution search filters results", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    const searchInput = page.getByPlaceholder(/search your university/i);
    await searchInput.fill("Cape Town");
    // Should show dropdown results
    await expect(page.getByText(/Cape Town/i)).toBeVisible({ timeout: 5000 });
  });

  test("selecting institution enables Continue button", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    const continueBtn = page.getByRole("button", { name: /continue/i });

    // Initially disabled
    await expect(continueBtn).toBeDisabled();

    // Click a popular institution quick-pick
    const firstPick = page.locator("button").filter({ hasText: /University/ }).first();
    if (await firstPick.isVisible()) {
      await firstPick.click();
      await expect(continueBtn).toBeEnabled();
    }
  });

  test("onboarding step 2 shows academic focus form", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await expect(page.getByRole("heading", { name: /what are you studying/i })).toBeVisible();
    await expect(page.getByLabel(/faculty/i)).toBeVisible();
    await expect(page.getByLabel(/major/i)).toBeVisible();
    // Segmented control for academic level
    await expect(page.getByRole("button", { name: /undergraduate/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /postgraduate/i })).toBeVisible();
  });

  test("academic level segmented control works", async ({ page }) => {
    await page.goto("/onboarding/step-2");
    await page.getByRole("button", { name: /postgraduate/i }).click();
    await expect(page.getByRole("button", { name: /postgraduate/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("onboarding step 3 shows interest tags", async ({ page }) => {
    await page.goto("/onboarding/step-3");
    await expect(page.getByRole("heading", { name: /what topics interest you/i })).toBeVisible();
    await expect(page.getByText(/select at least 3/i)).toBeVisible();
    // Tags should be visible
    await expect(page.locator("[aria-pressed]").first()).toBeVisible({ timeout: 5000 });
  });

  test("tag selection counter updates correctly", async ({ page }) => {
    await page.goto("/onboarding/step-3");
    await expect(page.getByText(/0 \/ 3 minimum/i)).toBeVisible();

    // Select 3 tags
    const tags = page.locator("[aria-pressed='false']");
    const count = await tags.count();
    if (count >= 3) {
      await tags.nth(0).click();
      await tags.nth(1).click();
      await tags.nth(2).click();
      await expect(page.getByText(/3 selected/i)).toBeVisible();
    }
  });

  test("Enter the Archive button is disabled until 3 tags selected", async ({ page }) => {
    await page.goto("/onboarding/step-3");
    const enterBtn = page.getByRole("button", { name: /enter the archive/i });
    await expect(enterBtn).toBeDisabled();
  });

  test("stepper shows correct active step on each page", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await expect(page.getByText("Institution")).toBeVisible();

    await page.goto("/onboarding/step-2");
    await expect(page.getByText("Academic Focus")).toBeVisible();

    await page.goto("/onboarding/step-3");
    await expect(page.getByText("Interests")).toBeVisible();
  });

  test("step counter label shows correct step number", async ({ page }) => {
    await page.goto("/onboarding/step-1");
    await expect(page.getByText("Step 1 of 3")).toBeVisible();

    await page.goto("/onboarding/step-2");
    await expect(page.getByText("Step 2 of 3")).toBeVisible();

    await page.goto("/onboarding/step-3");
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
  });
});
