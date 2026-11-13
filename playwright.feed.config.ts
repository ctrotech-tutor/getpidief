import { defineConfig, devices } from "@playwright/test";

// Run only against a disposable, locally seeded application. A loopback URL can
// still be a tunnel: the operator must verify the app's database and services.
if (process.env.FEED_BROWSER_TEST !== "yes") throw new Error("Set FEED_BROWSER_TEST=yes after confirming the application uses a disposable local database.");
const baseURL = process.env.FEED_TEST_BASE_URL ?? "http://localhost:3000";
const target = new URL(baseURL);
if (target.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || target.username || target.password || target.pathname !== "/" || target.search || target.hash) throw new Error("Feed browser tests require an HTTP loopback origin.");
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  outputDir: ".next/feed-browser-results",
  use: {
    baseURL,
    headless: true,
    launchOptions: process.env.FEED_BROWSER_EXECUTABLE ? { executablePath: process.env.FEED_BROWSER_EXECUTABLE, args: ["--no-sandbox", "--disable-dev-shm-usage"] } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
