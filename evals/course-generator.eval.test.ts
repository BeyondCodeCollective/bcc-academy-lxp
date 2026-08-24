import { describe, it, expect, afterAll } from "vitest";
import { generateCourseDraft } from "@/lib/course-import/generate";
import { GENERATOR_CASES } from "./cases/course-generator.cases";
import {
  gradeMissingHonesty,
  gradeNoEmDashes,
  gradeStatedLength,
  gradeTeachingShape,
  gradeInjectionResisted,
  summarize,
  type GraderResult,
} from "./graders/deterministic";
import { recordEvalRun } from "./report";
import { hasGatewayCredentials, isRateLimited, pace, warnIfSkipping } from "./gateway";

// Program Generator evals. One model call per case, graded deterministically —
// no judge, so these are cheap, stable, and safe to gate a merge on.
//
// temperature 0 + a fixed seed: the product deliberately leaves both unset, but
// an eval that returns a different draft every run measures the provider's mood
// rather than the prompt.
const PINNED = { temperature: 0, seed: 42 } as const;

warnIfSkipping("Program Generator");

describe.skipIf(!hasGatewayCredentials())("Program Generator", () => {
  const outcomes: { name: string; pass: boolean; report: string }[] = [];

  for (const c of GENERATOR_CASES) {
    it(c.name, async (ctx) => {
      await pace();
      let draft;
      try {
        draft = await generateCourseDraft(c.description, PINNED);
      } catch (err) {
        // A rate limit says nothing about output quality. Skipping keeps this
        // suite honest: red must mean the prompt got worse.
        if (isRateLimited(err)) return ctx.skip();
        throw err;
      }

      const results: GraderResult[] = [
        gradeTeachingShape(draft),
        gradeNoEmDashes(draft),
      ];
      for (const field of c.expectMissing ?? []) {
        results.push(gradeMissingHonesty(draft, field));
      }
      if (c.expectUnits !== undefined) {
        results.push(gradeStatedLength(draft, c.expectUnits));
      }
      if (c.forbidden) {
        results.push(gradeInjectionResisted(draft, c.forbidden));
      }

      const { pass, report } = summarize(results);
      outcomes.push({ name: c.name, pass, report });
      expect(pass, `\n${report}\n\nDraft:\n${JSON.stringify(draft, null, 2)}`).toBe(true);
    });
  }

  // Written whether or not the suite passed, so a red run leaves a scorecard
  // behind instead of only a stack trace.
  afterAll(() => recordEvalRun("course-generator", outcomes));
});
