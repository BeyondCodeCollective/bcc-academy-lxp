import { defineConfig } from "@playwright/test";

// QA regression suite. The default run is READ-ONLY against SMOKE_BASE_URL.
// writes.spec.ts is skipped unless QA_WRITES=1 (see tests/qa/README.md).
export default defineConfig({
  testDir: "./tests/qa",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "qa-results.json" }]],
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://bccacademy.io",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
