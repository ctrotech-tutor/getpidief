import { test as setup, expect } from "@playwright/test";
import path from "path";

// ── Auth state files — reused across all tests ────────────────────────────────
export const STUDENT_AUTH_FILE = path.join(__dirname, ".auth/student.json");
export const ADMIN_AUTH_FILE   = path.join(__dirname, ".auth/admin.json");

// ── Test credentials (must match scripts/seed.ts) ─────────────────────────────
const STUDENT = { email: "student@getpidief.dev", password: "Password123!" };
const ADMIN   = { email: "admin@getpidief.dev",   password: "Password123!"  };

// ── Student auth setup ────────────────────────────────────────────────────────
setup("authenticate as student", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Institutional Email").fill(STUDENT.email);
  await page.getByLabel("Password").fill(STUDENT.password);
  await page.getByRole("button", { name: "Sign In to Archive" }).click();
  await page.waitForURL("**/explore");
  await expect(page).toHaveURL(/explore/);
  await page.context().storageState({ path: STUDENT_AUTH_FILE });
});

// ── Admin auth setup ──────────────────────────────────────────────────────────
setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Institutional Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In to Archive" }).click();
  await page.waitForURL("**/explore");
  await expect(page).toHaveURL(/explore/);
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
