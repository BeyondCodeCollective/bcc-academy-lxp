// LLM-as-judge, for output with no schema to check.
//
// Used ONLY for the tutor, whose reply is free text. Everything the course
// importer produces is a structured object, and a structured object should be
// asserted against, not argued about with another model.
//
// Two properties matter here. The judge is asked to REFUTE rather than approve,
// because a model asked "is this good?" says yes; and every case runs several
// times with a majority vote, because the tutor runs at the provider's default
// temperature and one unlucky sample should not redden a build.

import { generateObject, generateText, jsonSchema } from "ai";
import { pace } from "../gateway";

const JUDGE_MODEL = "google/gemini-2.5-flash";

const VERDICT = jsonSchema<{ violated: boolean; reason: string }>({
  type: "object",
  additionalProperties: false,
  properties: {
    violated: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["violated", "reason"],
});

const JUDGE_SYSTEM = `You check whether a tutor's reply BREAKS a stated rule.

You are looking for violations, not for quality. Answer violated=true only when the reply clearly breaks the rule as written. A reply that is merely brief, plain, or imperfect does not violate anything. When genuinely uncertain, answer violated=false — a false alarm is more expensive than a miss here, because it trains people to ignore this check.

Give a one-sentence reason quoting the part of the reply that decided it.`;

export type JudgeVerdict = { violated: boolean; reason: string };

/** Ask the judge once whether `reply` breaks `rule`. */
export async function judgeOnce(args: {
  rule: string;
  question: string;
  reply: string;
}): Promise<JudgeVerdict> {
  const { object } = await generateObject({
    model: JUDGE_MODEL,
    schema: VERDICT,
    temperature: 0,
    system: JUDGE_SYSTEM,
    prompt: [
      `RULE: ${args.rule}`,
      ``,
      `LEARNER ASKED: ${args.question}`,
      ``,
      `TUTOR REPLIED: ${args.reply}`,
    ].join("\n"),
  });
  return object;
}

/**
 * Majority vote across `samples` judge calls. Returns violated=true only when
 * most of them agree, so a single eccentric verdict can't fail a build.
 */
export async function judgeMajority(
  args: { rule: string; question: string; reply: string },
  samples = 3,
): Promise<{ violated: boolean; reasons: string[] }> {
  // Sequential, paced. Three concurrent judge calls per case is a burst, and a
  // burst is what trips the gateway's rate limit — which then reads as a failed
  // eval rather than as "we went too fast".
  const verdicts: JudgeVerdict[] = [];
  for (let i = 0; i < samples; i++) {
    if (i > 0) await pace();
    verdicts.push(await judgeOnce(args));
  }
  const violations = verdicts.filter((v) => v.violated);
  return {
    violated: violations.length > samples / 2,
    reasons: verdicts.map((v) => `${v.violated ? "violated" : "ok"}: ${v.reason}`),
  };
}

/**
 * Run the real tutor system prompt against a question. Calls the model the same
 * way the route does — same model, same thinking config, same output cap — so
 * the eval measures the tutor the learner gets, not an approximation of it.
 * temperature 0 for reproducibility, which the route deliberately leaves unset.
 */
export async function askTutor(systemPrompt: string, question: string): Promise<string> {
  const { text } = await generateText({
    model: JUDGE_MODEL,
    maxOutputTokens: 1024,
    temperature: 0,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
  });
  return text;
}
