// Admin results: load a course's exit survey rows and summarize them.
// Untraceable on purpose: staff see answers with no name, email, participant
// code or timestamp, in an order that doesn't follow submission time, and
// completion only as a count. In a staff cohort the readers are often the
// learners' colleagues, so any per-person handle (or a "who hasn't answered"
// list next to the answers) lets them work out who said what.

import type { createServiceClient } from "@/lib/supabase/server";

export type ExitSurveyResult = {
  week_number: number;
  session_number: number;
  understanding: number | null;
  unclear_text: string | null;
  hours_text: string | null;
};

export type SessionSummary = {
  week: number;
  session: number;
  responses: number;
  average: number | null;
};

/**
 * Answers for one course, grouped by week and session. Within a session they
 * are sorted by content (rating, then text), never by time or person, so the
 * list order can't be matched to who submitted when.
 */
export async function loadExitSurveyResults(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
): Promise<ExitSurveyResult[]> {
  const { data } = await svc
    .from("session_exit_surveys")
    .select("week_number, session_number, understanding, unclear_text, hours_text")
    .eq("track_slug", trackSlug);
  return sortUntraceable((data ?? []) as ExitSurveyResult[]);
}

export function sortUntraceable(rows: ExitSurveyResult[]): ExitSurveyResult[] {
  return [...rows].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      a.session_number - b.session_number ||
      (a.understanding ?? 0) - (b.understanding ?? 0) ||
      (a.unclear_text ?? "").localeCompare(b.unclear_text ?? "") ||
      (a.hours_text ?? "").localeCompare(b.hours_text ?? ""),
  );
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
// How many enrolled learners have rated each session. A count only: a named
// "who hasn't answered" list shrinks as answers arrive, which ties names to
// answers in a small cohort.

export type SessionCompletion = {
  week: number;
  session: number;
  answered: number;
  enrolled: number;
};

export function completionBySession(
  enrolledIds: string[],
  rated: { student_id: string; week_number: number; session_number: number }[],
): SessionCompletion[] {
  const bySession = new Map<string, { week: number; session: number; ids: Set<string> }>();
  for (const r of rated) {
    const key = `${r.week_number}:${r.session_number}`;
    const g = bySession.get(key) ?? { week: r.week_number, session: r.session_number, ids: new Set<string>() };
    g.ids.add(r.student_id);
    bySession.set(key, g);
  }
  const enrolled = new Set(enrolledIds);
  return [...bySession.values()]
    .sort((a, b) => a.week - b.week || a.session - b.session)
    .map((g) => ({
      week: g.week,
      session: g.session,
      answered: [...g.ids].filter((id) => enrolled.has(id)).length,
      enrolled: enrolled.size,
    }));
}

/** Sessions that have at least one rating, with how many enrolled learners answered. */
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
      .select("student_id, students(is_test)")
      .eq("track_slug", trackSlug),
  ]);
  type Person = { is_test: boolean | null };
  const enrolledIds = ((enrollRows ?? []) as unknown as { student_id: string; students: Person | Person[] | null }[])
    .filter((r) => {
      const s = Array.isArray(r.students) ? r.students[0] : r.students;
      return s && !s.is_test;
    })
    .map((r) => r.student_id);
  return completionBySession(
    enrolledIds,
    (rated ?? []) as { student_id: string; week_number: number; session_number: number }[],
  );
}
