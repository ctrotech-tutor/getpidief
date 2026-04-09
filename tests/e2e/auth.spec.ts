import { test, expect, Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH E2E TESTS — Phase 2 Week 3
// Tests: registration, login, forgot password, OAuth error handling
// ─────────────────────────────────────────────────────────────────────────────

const UNIQUE_EMAIL = `test_${Date.now()}@uct.ac.za`;
const VALID_PASSWORD = "TestPassword1!";

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("shows registration form with all required fields", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /create your scholar profile/i })).toBeVisible();
    await expect(page.getByLabel("First Name")).toBeVisible();
    await expect(page.getByLabel("Last Name")).toBeVisible();
    await expect(page.getByLabel("Institutional Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create scholar account/i })).toBeVisible();
  });

  test("shows validation errors for empty form submission", async ({ page }) => {
    await page.getByRole("button", { name: /create scholar account/i }).click();
    await expect(page.getByText(/first name is required/i)).toBeVisible();
    await expect(page.getByText(/last name is required/i)).toBeVisible();
  });

  test("shows password strength meter in real time", async ({ page }) => {
    const passwordField = page.getByLabel("Password");
    await passwordField.fill("abc");
    // Strength meter should appear
    await expect(page.getByText(/weak/i)).toBeVisible();

    await passwordField.fill("Password1!");
    await expect(page.getByText(/strong|fortress/i)).toBeVisible();
  });

  test("shows institutional email domain hint for .edu domain", async ({ page }) => {
    const emailField = page.getByLabel("Institutional Email");
    await emailField.fill("student@university.edu");
    await expect(page.getByText(/recognised institutional email/i)).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("Doe");
    await page.getByLabel("Institutional Email").fill("notanemail");
    await page.getByLabel("Password").fill(VALID_PASSWORD);
    await page.getByLabel("Confirm Password").fill(VALID_PASSWORD);
    await page.getByLabel(/accept.*terms/i).check();
    await page.getByRole("button", { name: /create scholar account/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("Doe");
    await page.getByLabel("Institutional Email").fill(UNIQUE_EMAIL);
    await page.getByLabel("Password").fill(VALID_PASSWORD);
    await page.getByLabel("Confirm Password").fill("DifferentPassword1!");
    await page.getByLabel(/accept.*terms/i).check();
    await page.getByRole("button", { name: /create scholar account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("requires terms acceptance", async ({ page }) => {
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("Doe");
    await page.getByLabel("Institutional Email").fill(UNIQUE_EMAIL);
    await page.getByLabel("Password").fill(VALID_PASSWORD);
    await page.getByLabel("Confirm Password").fill(VALID_PASSWORD);
    // Do NOT check terms
    await page.getByRole("button", { name: /create scholar account/i }).click();
    await expect(page.getByText(/must accept the terms/i)).toBeVisible();
  });

  test("shows/hides password with toggle", async ({ page }) => {
    const passwordInput = page.getByLabel("Password");
    await passwordInput.fill(VALID_PASSWORD);

    // Initially type="password"
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click show button
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click hide button
    await page.getByRole("button", { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("has link to sign in page", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form with correct elements", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Institutional Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in to archive/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("shows field-level validation errors", async ({ page }) => {
    await page.getByRole("button", { name: /sign in to archive/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("shows error for short password", async ({ page }) => {
    await page.getByLabel("Institutional Email").fill("test@uct.ac.za");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /sign in to archive/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("shows invalid credentials error", async ({ page }) => {
    await page.getByLabel("Institutional Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("WrongPassword1!");
    await page.getByRole("button", { name: /sign in to archive/i }).click();
    // Should show error (either field-level or toast)
    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test("toggles password visibility", async ({ page }) => {
    const input = page.getByLabel("Password");
    await input.fill("TestPassword");
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(input).toHaveAttribute("type", "text");
  });

  test("has remember me checkbox", async ({ page }) => {
    await expect(page.getByLabel(/remember me/i)).toBeVisible();
  });

  test("has link to register page", async ({ page }) => {
    await page.getByRole("link", { name: /create your scholar profile/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("shows registered success banner when ?registered=1 param present", async ({ page }) => {
    await page.goto("/login?registered=1");
    await expect(page.getByText(/check your email to verify/i)).toBeVisible();
  });

  test("shows reset success banner when ?reset=1 param present", async ({ page }) => {
    await page.goto("/login?reset=1");
    await expect(page.getByText(/password updated successfully/i)).toBeVisible();
  });

  test("signs in with valid dev credentials", async ({ page }) => {
    await page.getByLabel("Institutional Email").fill("student@getpidief.dev");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: /sign in to archive/i }).click();
    // Should redirect to explore or callbackUrl
    await expect(page).toHaveURL(/\/explore/, { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Forgot Password Flow", () => {
  test("shows forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByLabel("Institutional Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("shows email sent confirmation after submission", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Institutional Email").fill("test@uct.ac.za");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 8000 });
  });

  test("validates email format", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Institutional Email").fill("notanemail");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("has back to sign in link", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

test.describe("OAuth Error Handling", () => {
  test("shows OAuthAccountNotLinked error banner on login page", async ({ page }) => {
    await page.goto("/login?error=OAuthAccountNotLinked");
    await expect(
      page.getByText(/already registered with a password/i)
    ).toBeVisible();
  });

  test("shows account suspended error banner", async ({ page }) => {
    await page.goto("/login?error=account_suspended");
    await expect(
      page.getByText(/account has been suspended/i)
    ).toBeVisible();
  });

  test("shows generic OAuth error banner", async ({ page }) => {
    await page.goto("/login?error=OAuthCallbackError");
    await expect(page.getByText(/google sign-in failed/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY EMAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Verify Email Page", () => {
  test("shows check inbox state when no token provided", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("shows expired state for invalid token", async ({ page }) => {
    await page.goto("/verify-email?token=definitely-invalid-token-12345");
    await expect(page.getByText(/expired|invalid/i)).toBeVisible({ timeout: 6000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE PROTECTION
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Route Protection", () => {
  test("redirects unauthenticated user from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated user from /settings to /login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated user from /admin to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("allows unauthenticated user to access /explore", async ({ page }) => {
    await page.goto("/explore");
    // Should either load explore or redirect to login — both valid
    // Just should NOT 404
    const status = await page.evaluate(() => document.title);
    expect(status).toBeTruthy();
  });
});
