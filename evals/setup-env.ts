import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local into process.env the way the scripts/ directory does.
// The AI SDK reads AI_GATEWAY_API_KEY off process.env, and vitest does not
// inherit `node --env-file`. In CI the key comes from the environment already,
// so a missing file is not an error.
try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key] !== undefined) continue; // real env wins
    process.env[key] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
  }
} catch {
  // No .env.local — expected in CI.
}
