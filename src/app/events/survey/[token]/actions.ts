"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { validateAnswers, type SurveyAnswerValue, type SurveyQuestion } from "@/lib/event-survey";

// Post-event survey, one response per family, keyed by the registration's
// survey token from the invite email. Resubmitting edits the response.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SurveyInput = {
  rating: number;
  wouldRecommend: boolean | null;
  enjoyed: string;
  improve: string;
};

export async function submitEventSurvey(token: string, input: SurveyInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: "This survey link is not valid." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Pick a rating from 1 to 5." };
  }
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const rl = rateLimit({ key: ip, scope: "event-survey", max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return { ok: false, error: "Too many submissions. Try again in a few minutes." };

  const svc = createServiceClient();
  const { data: reg } = await svc
    .from("event_registrations")
    .select("id, event_id")
    .eq("survey_token", token)
    .maybeSingle<{ id: string; event_id: string }>();
  if (!reg) return { ok: false, error: "This survey link is not valid." };

  const { error } = await svc.from("event_survey_responses").upsert(
    {
      event_id: reg.event_id,
      registration_id: reg.id,
      rating: input.rating,
      would_recommend: input.wouldRecommend,
      enjoyed: input.enjoyed.trim().slice(0, 2000) || null,
      improve: input.improve.trim().slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "registration_id" },
  );
  if (error) {
    console.error("[submitEventSurvey] upsert failed:", error);
    return { ok: false, error: "Could not save your answers. Please try again." };
  }
  return { ok: true };
}

// Same flow for an event with uploaded questions. Answers are validated against
// the event's questions server-side and stored as a prompt/type/value snapshot.
export async function submitCustomEventSurvey(
  token: string,
  values: SurveyAnswerValue[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: "This survey link is not valid." };
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const rl = rateLimit({ key: ip, scope: "event-survey", max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return { ok: false, error: "Too many submissions. Try again in a few minutes." };

  const svc = createServiceClient();
  const { data: reg } = await svc
    .from("event_registrations")
    .select("id, event_id, events(survey_questions)")
    .eq("survey_token", token)
    .maybeSingle();
  const row = reg as unknown as { id: string; event_id: string; events: { survey_questions: SurveyQuestion[] | null } | null } | null;
  const questions = row?.events?.survey_questions;
  if (!row || !questions) return { ok: false, error: "This survey link is not valid." };

  const checked = validateAnswers(questions, values);
  if (!checked.ok) return checked;
  const firstRating = checked.answers.find((a) => a.type === "rating" && typeof a.value === "number");

  const { error } = await svc.from("event_survey_responses").upsert(
    {
      event_id: row.event_id,
      registration_id: row.id,
      rating: (firstRating?.value as number | undefined) ?? null,
      would_recommend: null,
      enjoyed: null,
      improve: null,
      answers: checked.answers,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "registration_id" },
  );
  if (error) {
    console.error("[submitCustomEventSurvey] upsert failed:", error);
    return { ok: false, error: "Could not save your answers. Please try again." };
  }
  return { ok: true };
}
