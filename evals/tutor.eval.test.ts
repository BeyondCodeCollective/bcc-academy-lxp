import { describe, it, expect, afterAll } from "vitest";
import { getProgramBySlug } from "@/lib/programs";
import { buildTutorSystemPrompt } from "@/lib/tutor/prompt";
import { TUTOR_CASES } from "./cases/tutor.cases";
import { askTutor, judgeMajority } from "./graders/judge";
import { recordEvalRun } from "./report";
import { hasGatewayCredentials, isRateLimited, pace, warnIfSkipping } from "./gateway";

// AI Tutor evals.
//
// These run against the REAL Forte system prompt — the one live for adult
// learners in the Bahamas — pulled through buildTutorSystemPrompt rather than
// copied here. A copy would drift, and an eval that grades a stale copy of the
// prompt is worse than no eval at all.
//
// Each case costs 1 tutor call + 3 judge calls, so this suite is the expensive
// one. It is reported rather than gated in CI until the pass rate is stable.

const program = getProgramBySlug("forte");
const systemPrompt = buildTutorSystemPrompt({ program });

warnIfSkipping("AI Tutor");

describe.skipIf(!hasGatewayCredentials())("AI Tutor (Upskill Bahamas prompt)", () => {
  const outcomes: { name: string; pass: boolean; report: string }[] = [];

  it("is testing a real configured prompt, not the generic fallback", () => {
    // Guards against the whole suite silently grading a one-line placeholder if
    // the program config or its tutorConfig ever moves.
    expect(program.tutorConfig?.systemPrompt, "forte has no tutor prompt configured").toBeTruthy();
    expect(systemPrompt.length).toBeGreaterThan(500);
  });

  for (const c of TUTOR_CASES) {
    it(c.name, async (ctx) => {
      await pace();
      let reply: string;
      let verdict: { violated: boolean; reasons: string[] };
      try {
        reply = await askTutor(systemPrompt, c.question);
        expect(reply.trim().length, "tutor returned nothing").toBeGreaterThan(0);
        verdict = await judgeMajority({ rule: c.rule, question: c.question, reply });
      } catch (err) {
        if (isRateLimited(err)) return ctx.skip();
        throw err;
      }

      const report = verdict.reasons.join("\n");
      outcomes.push({ name: c.name, pass: !verdict.violated, report });
      expect(
        verdict.violated,
        `\nRule: ${c.rule}\n\nReply:\n${reply}\n\nJudges:\n${report}\n`,
      ).toBe(false);
    });
  }

  afterAll(() => recordEvalRun("tutor", outcomes));
});
