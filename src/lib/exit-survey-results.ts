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

// ─── Completion check ──────────────────────────────────────────────────────
// Who hasn't rated a session yet, by name. Kept apart from the answers on
// purpose: staff can chase completion without seeing who wrote what, because
// the answers above carry only participant codes.

export type SessionCompletion = {
  week: number;
  session: number;
  answered: number;
  enrolled: number;
  missing: string[];
};

export function completionBySession(
  enrolled: { id: string; name: string }[],
  rated: { student_id: string; week_number: number; session_number: number }[],
): SessionCompletion[] {
  const bySession = new Map<string, { week: number; session: number; ids: Set<string> }>();
  for (const r of rated) {
    const key = `${r.week_number}:${r.session_number}`;
    const g = bySession.get(key) ?? { week: r.week_number, session: r.session_number, ids: new Set<string>() };
    g.ids.add(r.student_id);
    bySession.set(key, g);
  }
  const enrolledIds = new Set(enrolled.map((e) => e.id));
  return [...bySession.values()]
    .sort((a, b) => a.week - b.week || a.session - b.session)
    .map((g) => ({
      week: g.week,
      session: g.session,
      answered: [...g.ids].filter((id) => enrolledIds.has(id)).length,
      enrolled: enrolled.length,
      missing: enrolled
        .filter((e) => !g.ids.has(e.id))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b)),
    }));
}

/** Sessions that have at least one rating, with the enrolled learners missing from each. */
export async function loadExitSurveyCompletion(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
): Promise<SessionCompletion[]> {
  const [{ data: rated }, { data: enrollRows }] = await Promise.all([
    svc
      .from("session_exit_surveys")
      .select("student_id, week_number, session_number")
      .eq("track_slug", trackSlug)
      .not("understanding", "is", null),
    svc
      .from("student_tracks")
      .select("student_id, students(first_name, last_name, email, is_test)")
      .eq("track_slug", trackSlug),
  ]);
  type Person = { first_name: string | null; last_name: string | null; email: string | null; is_test: boolean | null };
  const enrolled = ((enrollRows ?? []) as unknown as { student_id: string; students: Person | Person[] | null }[])
    .map((r) => ({ id: r.student_id, s: Array.isArray(r.students) ? r.students[0] : r.students }))
    .filter((r) => r.s && !r.s.is_test)
    .map((r) => ({
      id: r.id,
      name: [r.s?.first_name, r.s?.last_name].filter(Boolean).join(" ").trim() || r.s?.email || "Unknown",
    }));
  return completionBySession(
    enrolled,
    (rated ?? []) as { student_id: string; week_number: number; session_number: number }[],
  );
}
