// Admin results: load a course's exit survey rows and summarize them.
// Rows are identified by participant code only, never name or email, so
// learners can be candid about a session without the facilitator knowing who.

import { NO_PARTICIPANT_CODE } from "@/lib/surveys/participant-code";

import type { createServiceClient } from "@/lib/supabase/server";

export type ExitSurveyResult = {
  week_number: number;
  session_number: number;
  understanding: number | null;
  unclear_text: string | null;
  hours_text: string | null;
  updated_at: string;
  participant_code: string;
};

export type SessionSummary = {
  week: number;
  session: number;
  responses: number;
  average: number | null;
};

export async function loadExitSurveyResults(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
): Promise<ExitSurveyResult[]> {
  const { data } = await svc
    .from("session_exit_surveys")
    .select(
      "week_number, session_number, understanding, unclear_text, hours_text, updated_at, participant_code",
    )
    .eq("track_slug", trackSlug)
    .order("week_number")
    .order("session_number")
    .order("updated_at");
  type Row = Omit<ExitSurveyResult, "participant_code"> & { participant_code: string | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    participant_code: r.participant_code || NO_PARTICIPANT_CODE,
  }));
}

/** Average rating per session, counting only rows that carry a rating. */
export function summarizeBySession(rows: ExitSurveyResult[]): SessionSummary[] {
  const groups = new Map<string, { week: number; session: number; ratings: number[] }>();
  for (const r of rows) {
    if (r.understanding === null) continue;
    const key = `${r.week_number}:${r.session_number}`;
    const g = groups.get(key) ?? { week: r.week_number, session: r.session_number, ratings: [] };
    g.ratings.push(r.understanding);
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => a.week - b.week || a.session - b.session)
    .map((g) => ({
      week: g.week,
      session: g.session,
      responses: g.ratings.length,
      average: Math.round((g.ratings.reduce((s, n) => s + n, 0) / g.ratings.length) * 10) / 10,
    }));
}
