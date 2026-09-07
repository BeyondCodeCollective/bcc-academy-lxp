import { defineConfig } from "vitest/config";

// Model evals. These make real gateway calls, so they are slow, cost money, and
// are never part of `pnpm test`. Run with `pnpm eval`.
//
// The long timeout is not padding: generateObject against a reasoning model
// routinely takes 20s+, and the tutor rubric runs each case three times.
export default defineConfig({
  resolve: { alias: { "@": process.cwd() + "/src" } },
  test: {
    include: ["evals/**/*.eval.test.ts"],
    environment: "node",
    setupFiles: ["./evals/setup-env.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Sequential. Parallel eval files would hammer the gateway's rate limit and
    // turn a quality signal into a flakiness signal.
    fileParallelism: false,
  },
});
