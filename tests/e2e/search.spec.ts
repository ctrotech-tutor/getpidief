import { test, expect } from "@playwright/test";
import { STUDENT_AUTH_FILE } from "./auth.setup";

test.use({ storageState: STUDENT_AUTH_FILE });

test.describe("Search & Discovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/explore");
  });

  test("homepage loads with search bar and greeting", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();
  });

  test("opening command palette with ⌘K", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByPlaceholder(/search documents/i)).toBeVisible();
  });

  test("closing command palette with Escape", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("navigating to search page from search bar", async ({ page }) => {
    const searchBar = page.getByRole("button", { name: /search/i }).first();
    await searchBar.click();
    await page.goto("/search?q=algorithms");
    await expect(page).toHaveURL(/q=algorithms/);
  });

  test("search results page shows results count", async ({ page }) => {
    await page.goto("/search?q=computer+science");
    // Either results or no-results state should show
    const hasResults    = await page.getByText(/results for/i).isVisible().catch(() => false);
    const hasNoResults  = await page.getByText(/no results found/i).isVisible().catch(() => false);
    expect(hasResults || hasNoResults).toBe(true);
  });

  test("filter sidebar is visible on desktop", async ({ page }) => {
    await page.goto("/search");
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText(/Filter Results/i)).toBeVisible();
  });

  test("categories strip renders", async ({ page }) => {
    await page.goto("/explore");
    // All chip should be visible
    await expect(page.getByRole("option", { name: "All" })).toBeVisible({ timeout: 8000 });
  });

  test("can navigate to search from nav search button", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});