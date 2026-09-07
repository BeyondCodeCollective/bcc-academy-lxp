# Evals

Golden-set checks on the platform's AI surfaces. `pnpm eval`.

## What's here

| Suite | Grades | Cost per run |
|---|---|---|
| `course-generator.eval.test.ts` | The Program Generator's structured output, **deterministically** | 1 call per case (6) |
| `tutor.eval.test.ts` | The live Upskill Bahamas tutor prompt, via **LLM-as-judge** | 4 calls per case (24) |

Unit tests are separate and free: `pnpm test` runs `src/**/*.test.ts` with no network.

## The two grader families

**Deterministic** (`graders/deterministic.ts`) carries most of the weight. The
course prompts make checkable promises, so we assert them directly rather than
asking a model for an opinion. The most important one: given a description that
states no date, the draft must leave `startDate` empty **and** name it in
`missing[]`. `generate.ts` puts it plainly — *"A plausible-looking guessed date
is worse than a blank"* — and a prompt edit that starts inventing dates is the
regression this suite exists to catch.

**Judge** (`graders/judge.ts`) is used only for the tutor, whose reply is free
text with no schema. The judge is asked to *refute*, not approve, because a
model asked "is this good?" says yes. Each case is judged three times and needs
a majority, so one eccentric verdict can't redden a build.

Tutor evals run against the real prompt via `buildTutorSystemPrompt` — never a
copy. A copy drifts, and grading a stale copy of a prompt is worse than not
grading it.

## Credentials

Either `AI_GATEWAY_API_KEY` or a fresh `VERCEL_OIDC_TOKEN` works. Locally:

```bash
vercel env pull        # refreshes VERCEL_OIDC_TOKEN — it expires within hours
pnpm eval
```

Without credentials the suites **skip** rather than fail. A suite that goes red
for a missing key teaches people to ignore red, which is how the Playwright
smoke suite ended up unread for seven weeks.

## Rate limits

This account's AI Gateway is on the **free tier**, which cannot sustain a full
run: the tutor suite alone is 24 calls. Rate-limited cases **skip**, they do not
fail — a rate limit says nothing about output quality, and reporting it as a
failed eval would be a lie.

Until paid credits are enabled, treat this suite as reporting-only. Do not make
it a required check: it has not yet completed a clean full-suite baseline.

## Adding a case

Keep the set small and pointed. Every case costs a call on every run, and ten
cases that each catch a real regression beat fifty that restate the schema.
Prefer a deterministic grader; reach for the judge only when the output has no
structure to assert against.

## Scorecard

`evals/last-run.json` (gitignored) records pass counts and per-case detail from
the last run, including failures — so a red run leaves something readable behind
rather than only a stack trace.
