import { test as setup, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { STUDENT_AUTH_FILE, ADMIN_AUTH_FILE } from "./auth.paths";

// ── Test credentials (must match scripts/seed.ts) ─────────────────────────────
const STUDENT = { email: "student@getpidief.dev", password: "Password123!" };
const ADMIN   = { email: "admin@getpidief.dev",   password: "Password123!"  };

// Local dev can be slow; setup login should have a generous timeout.
setup.setTimeout(120_000);

async function loginAndPersistState(
  page: Page,
  creds: { email: string; password: string },
  outputPath: string
) {
  await page.goto("/login");
  await page.getByLabel("Institutional Email").fill(creds.email);
  await page.locator("#login-password").fill(creds.password);
  await page.getByRole("button", { name: "Sign In to Archive" }).click();

  // Auth can land on explore or onboarding depending on profile completion.
  await page.waitForURL(
    /\/(explore|dashboard|onboarding\/step-[1-3])(\/|\?|$)/,
    { timeout: 60_000 }
  );

  await expect(page).not.toHaveURL(/\/login(\?|$)/);
  await page.context().storageState({ path: outputPath });
}

// ── Student auth setup ────────────────────────────────────────────────────────
setup("authenticate as student", async ({ page }) => {
  await loginAndPersistState(page, STUDENT, STUDENT_AUTH_FILE);
});

// ── Admin auth setup ──────────────────────────────────────────────────────────
setup("authenticate as admin", async ({ page }) => {
  await loginAndPersistState(page, ADMIN, ADMIN_AUTH_FILE);
});

export { ADMIN, STUDENT, ADMIN_AUTH_FILE, STUDENT_AUTH_FILE };
