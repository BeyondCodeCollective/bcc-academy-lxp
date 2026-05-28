import { defineConfig } from "@playwright/test";

// Smoke tests for the login + signup flows. Run against a deployed URL
// (preview or production) via SMOKE_BASE_URL. The tests do not start a
// dev server themselves — point them at whatever was just deployed.
export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://bccacademy.io",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
