import { defineConfig } from "@playwright/test";

// End-to-end checks of the main journeys. They run in GitHub Actions against a local copy of the
// database (Supabase started in Docker) and the built website. See .github/workflows/journeys.yml.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
});
