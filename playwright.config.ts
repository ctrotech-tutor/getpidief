import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect:  { timeout: 5_000 },

  // Run tests in parallel across files, but serial within a file
  fullyParallel: true,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : undefined,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL:             process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace:               "on-first-retry",
    screenshot:          "only-on-failure",
    video:               "retain-on-failure",
    actionTimeout:       10_000,
    navigationTimeout:   15_000,
  },

  projects: [
    // ── Setup: create auth state ──────────────────────────────────────────
    {
      name:    "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // ── Desktop browsers ──────────────────────────────────────────────────
    {
      name:         "chromium",
      use:          { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name:         "firefox",
      use:          { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },
    {
      name:         "webkit",
      use:          { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
    },

    // ── Mobile ────────────────────────────────────────────────────────────
    {
      name: "mobile-chrome",
      use:  { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use:  { ...devices["iPhone 12"] },
      dependencies: ["setup"],
    },
  ],

  // Start dev server automatically for local runs
  webServer: process.env.CI
    ? undefined
    : {
        command:             "pnpm dev",
        url:                 "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout:             120_000,
      },
});
