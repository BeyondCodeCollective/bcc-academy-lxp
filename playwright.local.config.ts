import { defineConfig, devices } from "@playwright/test";

// LOCAL-ONLY E2E config. Never points at production.
// Servers: a Supabase stub on :54399 and `next start` on :3100 (needs a prior
// `next build` made with the same fake NEXT_PUBLIC_* values, see tests/e2e/README.md).
const PORT = Number(process.env.E2E_PORT || 3100);
const STUB_PORT = Number(process.env.E2E_STUB_PORT || 54399);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

const host = new URL(baseURL).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`playwright.local.config.ts refuses non-local baseURL: ${baseURL}`);
}

const fakeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${STUB_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-key",
};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  outputDir: "./test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/report.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/supabase-stub.mjs",
      url: `http://localhost:${STUB_PORT}/__log`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { STUB_PORT: String(STUB_PORT) },
    },
    {
      command: `pnpm exec next start -p ${PORT}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...fakeEnv, PORT: String(PORT) },
    },
  ],
});
