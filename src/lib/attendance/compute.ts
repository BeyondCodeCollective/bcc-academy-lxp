/**
 * Pure attendance helpers. Operates on TrackConfig + AttendanceRecord —
 * no hardcoded slugs, no hardcoded dates, no special-cased programs.
 * Anything that needs to know "how many sessions has track X had so far"
 * or "what's this student's rate" goes through here.
 */

import { computeCurrentWeek } from "@/lib/utils";

export type AttendanceRecord = {
  id: string;
  student_id: string;
  track: string;
  week_number: number;
  session_number: number;
  checked_in_at: string;
  marked_by: string | null;
};

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type TrackLike = {
  slug: string;
  name: string;
  shortName: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  startDate: string;
  lastSessionDayOffset: number;
  /** Server-resolved current unit (handles day-gated camps). Falls back to
   *  computeCurrentWeek when absent. */
  currentUnit?: number;
};

export type ExpectedSession = {
  trackSlug: string;
  week: number;
  session: number;
};

export type RiskStatus = "on-track" | "at-risk" | "disengaged";

export type StudentSummary = {
  student: StudentRow;
  /** Per-track rate keyed by slug; missing key = no expected sessions yet. */
  byTrack: Record<string, { attended: number; expected: number; rate: number }>;
  /** Sum across all tracks the student is exposed to. */
  attended: number;
  expected: number;
  rate: number;
  /** Most recent expected sessions (any track) the student missed, in a row. */
  consecutiveMisses: number;
  status: RiskStatus;
};

/**
 * How many sessions of `track` have happened on or before today. Returns 0
 * if the track hasn't started yet.
 */
export function elapsedSessions(track: TrackLike, asOf: Date = new Date()): number {
  const start = new Date(track.startDate);
  if (asOf < start) return 0;
  const currentWeek = computeCurrentWeek(
    track.startDate,
    track.totalWeeks,
    track.lastSessionDayOffset
  );
  return currentWeek * track.sessionsPerWeek;
}

/**
 * The list of session slots that should have happened for this track up to
 * `asOf`. Order is chronological (week 1 session 1 → week N session M).
 */
export function expectedSessionsFor(
  track: TrackLike,
  asOf: Date = new Date()
): ExpectedSession[] {
  const start = new Date(track.startDate);
  if (asOf < start) return [];
  const currentWeek = computeCurrentWeek(
    track.startDate,
    track.totalWeeks,
    track.lastSessionDayOffset
  );
  const out: ExpectedSession[] = [];
  for (let w = 1; w <= currentWeek; w++) {
    for (let s = 1; s <= track.sessionsPerWeek; s++) {
      out.push({ trackSlug: track.slug, week: w, session: s });
    }
  }
  return out;
}

/** Returns 0–100 (integer). Empty expected set → 100% (nothing to miss yet). */
function pct(attended: number, expected: number): number {
  if (expected <= 0) return 100;
  return Math.round((attended / expected) * 100);
}

/**
 * Per-week attendance rate for one track. Index 0 = week 1.
 * Each value is the share of `students` who attended *at least one* session
 * in that week — matches how the trend chart reads ("did they show up that
 * week"). For multi-session weeks this is the more honest metric than
 * "average across sessions" since one person missing both sessions and one
 * missing one shouldn't average out the same.
 */
export function weeklyAttendanceRates(
  track: TrackLike,
  students: StudentRow[],
  records: AttendanceRecord[]
): number[] {
  if (students.length === 0) return [];
  const elapsed = computeCurrentWeek(
    track.startDate,
    track.totalWeeks,
    track.lastSessionDayOffset
  );
  const trackRecords = records.filter((r) => r.track === track.slug);
  const out: number[] = [];
  for (let w = 1; w <= elapsed; w++) {
    const presentCount = students.filter((s) =>
      trackRecords.some((r) => r.student_id === s.id && r.week_number === w)
    ).length;
    out.push(Math.round((presentCount / students.length) * 100));
  }
  return out;
}

/**
 * Roll a single student up across a set of tracks. Caller decides which
 * tracks the student is "exposed to" (program-wide, or filtered to their
 * enrolled tracks).
 */
export function summarizeStudent(
  student: StudentRow,
  tracks: TrackLike[],
  records: AttendanceRecord[],
  asOf: Date = new Date()
): StudentSummary {
  const byTrack: StudentSummary["byTrack"] = {};
  let attended = 0;
  let expected = 0;

  // A session "counts" only when an admin has actually taken attendance
  // for it — i.e. when at least one student has a record for that slot.
  // Sessions that should have happened but where no one was ever marked
  // are excluded from `expected`. Previously every scheduled session
  // counted, which made every student in an unmarked class read as
  // "0/35 sessions · 35 in a row missed" even when the admin simply
  // hadn't recorded attendance yet.
  const takenKey = (trackSlug: string, week: number, session: number) =>
    `${trackSlug}|${week}|${session}`;
  const takenSlots = new Set<string>();
  for (const r of records) {
    takenSlots.add(takenKey(r.track, r.week_number, r.session_number));
  }

  for (const track of tracks) {
    const sessions = expectedSessionsFor(track, asOf).filter((s) =>
      takenSlots.has(takenKey(s.trackSlug, s.week, s.session)),
    );
    if (sessions.length === 0) {
      byTrack[track.slug] = { attended: 0, expected: 0, rate: 100 };
      continue;
    }
    const recordsForTrack = records.filter(
      (r) => r.student_id === student.id && r.track === track.slug,
    );
    const trackAttended = recordsForTrack.length;
    byTrack[track.slug] = {
      attended: trackAttended,
      expected: sessions.length,
      rate: pct(trackAttended, sessions.length),
    };
    attended += trackAttended;
    expected += sessions.length;
  }

  // Consecutive misses: walk only sessions where attendance was taken,
  // newest first, count until we find one this student attended.
  // Sessions the admin never recorded don't penalize anyone.
  const takenExpected = tracks
    .flatMap((t) => expectedSessionsFor(t, asOf))
    .filter((s) => takenSlots.has(takenKey(s.trackSlug, s.week, s.session)))
    .sort((a, b) => b.week - a.week || b.session - a.session);
  let consecutiveMisses = 0;
  for (const slot of takenExpected) {
    const attendedSlot = records.some(
      (r) =>
        r.student_id === student.id &&
        r.track === slot.trackSlug &&
        r.week_number === slot.week &&
        r.session_number === slot.session
    );
    if (attendedSlot) break;
    consecutiveMisses++;
  }

  const rate = pct(attended, expected);
  let status: RiskStatus = "on-track";
  if (rate < 50 || consecutiveMisses >= 4) status = "disengaged";
  else if (rate < 80 || consecutiveMisses >= 2) status = "at-risk";

  return {
    student,
    byTrack,
    attended,
    expected,
    rate,
    consecutiveMisses,
    status,
  };
}

export function summarizeAllStudents(
  students: StudentRow[],
  tracks: TrackLike[],
  records: AttendanceRecord[],
  asOf: Date = new Date()
): StudentSummary[] {
  return students.map((s) => summarizeStudent(s, tracks, records, asOf));
}
