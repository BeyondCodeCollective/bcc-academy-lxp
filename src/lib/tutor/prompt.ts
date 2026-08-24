// The AI Tutor's prompt, as pure functions.
//
// This lived inline in the route handler, which meant the only way to see what
// the tutor is actually told was to make an authenticated HTTP request with a
// real enrolled learner. Nothing could test it. Pulling it out here changes no
// behaviour — the strings are lifted verbatim — but it makes the prompt a thing
// you can call, print, and assert on.
//
// Also the chat request shape, validated rather than cast: the route previously
// took `(await request.json()) as { messages: {role, content}[] }`, which is a
// promise to the type checker and nothing to the runtime.

import type { ProgramConfig, TrackConfig, WeekConfig } from "@/lib/programs/types";

/** History ceiling. A tutor turn needs recent context, not a transcript, and an
 *  unbounded array is a free way to run up someone else's model bill. */
export const MAX_HISTORY_MESSAGES = 40;
/** Per-message ceiling. Comfortably longer than any real question. */
export const MAX_MESSAGE_CHARS = 8_000;

export type TutorMessage = { role: "user" | "assistant"; content: string };

/**
 * The per-week context appended to the program's system prompt. Empty string
 * when the student has no resolvable track/week — the tutor still answers, it
 * just answers without knowing where they are in the course.
 */
export function buildTutorContextBlock(
  track: TrackConfig | undefined,
  week: WeekConfig | undefined,
  currentWeekNumber: number | null,
): string {
  if (!track || !week) return "";
  return [
    "",
    "—",
    `The student is currently in the "${track.name}" track, Week ${currentWeekNumber ?? week.week}: "${week.title}"${week.subtitle ? ` — ${week.subtitle}` : ""}.`,
    week.description ?? "",
    week.objectives?.length
      ? `This week's objectives:\n${week.objectives.map((o) => `- ${o}`).join("\n")}`
      : "",
    "Lean into this week's material when it helps — but answer earlier questions if they ask.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The complete system prompt: the program's own tutor persona plus the week
 * context. The generic fallback is effectively unreachable in production
 * (isTutorAvailable requires tutorConfig.enabled), but it keeps this function
 * total so it can be called with any program.
 */
export function buildTutorSystemPrompt(args: {
  program: Pick<ProgramConfig, "name" | "tutorConfig">;
  track?: TrackConfig;
  week?: WeekConfig;
  currentWeekNumber?: number | null;
}): string {
  const base =
    args.program.tutorConfig?.systemPrompt ??
    `You are an AI tutor for ${args.program.name}. Help students with their coursework.`;
  return base + buildTutorContextBlock(args.track, args.week, args.currentWeekNumber ?? null);
}

export type ParsedTutorRequest =
  | { ok: true; messages: TutorMessage[] }
  | { ok: false; error: string };

/**
 * Validate a chat request body. Rejects rather than coerces: a forged "system"
 * turn or a 10 MB array should be a 400, not something we quietly reshape and
 * hand to the model.
 */
export function parseTutorRequest(body: unknown): ParsedTutorRequest {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object." };
  }
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return { ok: false, error: "Expected a messages array." };
  if (raw.length === 0) return { ok: false, error: "No messages." };
  if (raw.length > MAX_HISTORY_MESSAGES) {
    return { ok: false, error: "That conversation is too long. Start a new one." };
  }

  const messages: TutorMessage[] = [];
  for (const m of raw) {
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: "Each message must be an object." };
    }
    const { role, content } = m as { role?: unknown; content?: unknown };
    // Only the two conversational roles. "system" from a client would let the
    // caller rewrite the tutor's instructions for their own session.
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "Each message needs a role of user or assistant." };
    }
    if (typeof content !== "string" || content.trim() === "") {
      return { ok: false, error: "Each message needs non-empty text." };
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: "That message is too long." };
    }
    messages.push({ role, content });
  }
  return { ok: true, messages };
}
