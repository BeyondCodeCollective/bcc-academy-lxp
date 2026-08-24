// Which model every AI surface talks to, and how.
//
// All four call sites hardcoded "google/gemini-2.5-flash" through the Vercel AI
// Gateway. That gateway account is on the free tier, which rate-limits this
// model — and production authenticates to the same gateway via OIDC, so the
// live tutor is subject to the same ceiling. At 16 tutor messages ever nobody
// has hit it; under real usage a learner gets the "trouble reaching my brain"
// fallback instead of an answer.
//
// This makes the provider a one-variable decision instead of four edits.
// AI_PROVIDER is unset by default, so nothing changes until someone sets it.

import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/** The shipped default: Gemini Flash via the Vercel AI Gateway. */
const GATEWAY_MODEL = "google/gemini-2.5-flash";

/** Claude Haiku 4.5 — $1/1M in, $5/1M out. At this platform's volume that is a
 *  few dollars a month, and it bills against ANTHROPIC_API_KEY rather than the
 *  gateway's free tier. Override with ANTHROPIC_MODEL to move up a tier. */
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

export function usingAnthropic(): boolean {
  return process.env.AI_PROVIDER === "anthropic";
}

/** The model to hand to generateText / generateObject. */
export function aiModel(): LanguageModel {
  return usingAnthropic() ? anthropic(ANTHROPIC_MODEL) : GATEWAY_MODEL;
}

/** Which model actually answered, for logging. tutor_messages.model is how you
 *  tell afterwards which provider served a given exchange. */
export function aiModelName(): string {
  return usingAnthropic() ? ANTHROPIC_MODEL : GATEWAY_MODEL;
}

/**
 * Provider-specific options, which are NOT portable.
 *
 * Gemini 2.5 Flash is a reasoning model that burns most of its output budget
 * thinking before replying — wasteful for a chat tutor and it truncates
 * answers, hence thinkingBudget 0. Claude has no equivalent knob here, and
 * sending a `google` block to Anthropic is meaningless. Branch rather than
 * spread one object over both.
 */
export function aiProviderOptions() {
  return usingAnthropic()
    ? undefined
    : { google: { thinkingConfig: { thinkingBudget: 0 } } };
}
