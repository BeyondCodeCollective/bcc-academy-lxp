import { defineConfig } from "vitest/config";

// Unit tests: pure functions, no network, no database, no model calls.
// Fast enough to run on every push. Model evals live in vitest.evals.config.ts
// because they cost money and need a gateway key — keeping them apart means
// `pnpm test` can be a required check while `pnpm eval` stays deliberate.
export default defineConfig({
  resolve: { alias: { "@": process.cwd() + "/src" } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
