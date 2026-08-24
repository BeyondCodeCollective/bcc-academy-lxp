import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// A scorecard for the last eval run.
//
// vitest's own output tells you what failed right now; this leaves a small
// machine-readable record so a pass rate can be compared across runs and posted
// from CI. Deliberately a file, not a table — evals are a development signal,
// not platform data, and this repo already keeps that kind of artifact on disk.

export type EvalOutcome = { name: string; pass: boolean; report: string };

const OUT = resolve(process.cwd(), "evals/last-run.json");

type RunFile = {
  generatedAt: string;
  suites: Record<string, { passed: number; total: number; cases: EvalOutcome[] }>;
};

function read(): RunFile {
  try {
    return JSON.parse(readFileSync(OUT, "utf8")) as RunFile;
  } catch {
    return { generatedAt: new Date().toISOString(), suites: {} };
  }
}

/** Merge one suite's results into the scorecard. Suites run in separate files,
 *  so each adds its own section rather than overwriting the file. */
export function recordEvalRun(suite: string, cases: EvalOutcome[]): void {
  if (cases.length === 0) return;
  const file = read();
  file.generatedAt = new Date().toISOString();
  file.suites[suite] = {
    passed: cases.filter((c) => c.pass).length,
    total: cases.length,
    cases,
  };
  try {
    mkdirSync(resolve(process.cwd(), "evals"), { recursive: true });
    writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");
  } catch (err) {
    // Never fail a suite because the scorecard couldn't be written.
    console.error("[evals] could not write scorecard:", err);
  }
}
