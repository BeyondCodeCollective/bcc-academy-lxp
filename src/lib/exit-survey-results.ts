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
  /** Old statement ("explain to a colleague"), answered before 2026-11-19. */
  understanding: number | null;
  /** Current statement ("use on a real task this week"). */
  application: number | null;
  blocker: string | null;
  unclear_text: string | null;
  hours_text: string | null;
};

/** The two 1 to 5 statements. Different questions, so never averaged together. */
export type RatingKey = "application" | "understanding";

export type SessionSummary = {
  week: number;
  session: number;
  question: RatingKey;
  responses: number;
  average: number | null;
};

/** The row's rating, whichever statement it answered. */
export function ratingOf(r: ExitSurveyResult): number | null {
  return r.application ?? r.understanding;
}

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
    .select("week_number, session_number, understanding, application, blocker, unclear_text, hours_text")
    .eq("track_slug", trackSlug);
  return sortUntraceable((data ?? []) as ExitSurveyResult[]);
}

export function sortUntraceable(rows: ExitSurveyResult[]): ExitSurveyResult[] {
  return [...rows].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      a.session_number - b.session_number ||
      (ratingOf(a) ?? 0) - (ratingOf(b) ?? 0) ||
      (a.blocker ?? "").localeCompare(b.blocker ?? "") ||
      (a.unclear_text ?? "").localeCompare(b.unclear_text ?? "") ||
      (a.hours_text ?? "").localeCompare(b.hours_text ?? ""),
  );
}

/**
 * Average rating per session and statement, counting only rows that carry
 * that rating. A session answered under both statements gets two entries,
 * current statement first.
 */
export function summarizeBySession(rows: ExitSurveyResult[]): SessionSummary[] {
  const groups = new Map<string, { week: number; session: number; question: RatingKey; ratings: number[] }>();
  for (const r of rows) {
    for (const question of ["application", "understanding"] as const) {
      const v = r[question];
      if (v === null) continue;
      const key = `${r.week_number}:${r.session_number}:${question}`;
      const g = groups.get(key) ?? { week: r.week_number, session: r.session_number, question, ratings: [] };
      g.ratings.push(v);
      groups.set(key, g);
    }
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        a.week - b.week ||
        a.session - b.session ||
        (a.question === b.question ? 0 : a.question === "application" ? -1 : 1),
    )
    .map((g) => ({
      week: g.week,
      session: g.session,
      question: g.question,
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
      .or("understanding.not.is.null,application.not.is.null"),
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
