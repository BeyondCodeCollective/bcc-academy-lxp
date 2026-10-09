/**
 * The three Part 4 prompts — kept in a plain module, not inside
 * session-stage.tsx, because that file is "use client" and a Server
 * Component (the live page) importing plain data across that boundary is
 * unreliable in the RSC bundle: the array came through as `undefined` at
 * runtime with tsc reporting nothing wrong. A page.tsx and a client
 * component can both import a plain module like this one safely.
 *
 * The first prompt is kept byte-identical to the original single-prompt
 * text so an existing saved answer still pre-fills under the same key.
 */
export const RULEBOOK_PROMPTS = [
  {
    key: "quick",
    label: "An automatic yes",
    prompt: "The call I make in about four seconds that would take someone new an hour to get wrong is…",
    placeholder: "One sentence. The thing you just know.",
  },
  {
    key: "hold",
    label: "One you'd hold",
    prompt: "One thing at my job I'd want double-checked before it goes through — not refused, just checked — is…",
    placeholder: "One sentence. What needs a second look, not a no.",
  },
  {
    key: "never",
    label: "An automatic no",
    prompt: "One thing I would never let a machine touch without a person is…",
    placeholder: "One sentence. Your own standing rule.",
  },
] as const;

export const RULEBOOK_PROMPT_TEXTS = RULEBOOK_PROMPTS.map((p) => p.prompt);
