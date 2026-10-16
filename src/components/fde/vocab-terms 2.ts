/**
 * The intro warm-up vocabulary — general AI-deployment terms this course
 * already teaches (docs/forward-deploy/course/SOURCE.md), taught here before
 * the case study starts. Kept in a plain module, not inside
 * session-stage.tsx, for the same reason RULEBOOK_PROMPTS is: that file is
 * "use client" and a Server Component importing plain data across that
 * boundary has come back `undefined` at runtime before.
 *
 * Distinct from the 4 case-specific terms (Clean confirm / Hold state /
 * Scoped confirm / Standing rule) taught inside the case study itself —
 * those stay exactly where they are.
 */
export const VOCAB_TERMS = [
  {
    term: "System of record",
    def: "The one place data is officially true — the agent never changes it without a human clicking send.",
  },
  {
    term: "Guardrail",
    def: "A boundary the AI can't cross by design, not by asking nicely.",
  },
  {
    term: "Human in the loop",
    def: "A person approves the action before it's real.",
  },
  {
    term: "Happy path / unhappy path",
    def: "The one clean scenario, and the thousand messy ones that are actually the job.",
  },
  {
    term: "Eval",
    def: "A test built from real past cases with known-correct answers — not a demo.",
  },
  {
    term: "Leverage point",
    def: "The smallest build that moves the most work with the least AI authority.",
  },
] as const;
