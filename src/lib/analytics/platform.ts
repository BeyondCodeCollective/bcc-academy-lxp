import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { isEngaged } from "./engagement";
import {
  type Delta,
  type Period,
  type RangePreset,
  delta,
  formatPeriod,
  resolveRange,
} from "./period";

// Platform-wide analytics — the ONE surface that ignores the program switcher.
//
// Every other analytics surface is deliberately program-scoped (see
// actions-analytics.ts): an admin sees their own program, a super-admin sees
// whichever program they switched into. Nothing anywhere added the programs up,
// so "how big is the platform" could only be answered by visiting each program
// and doing arithmetic by hand. This module answers it in one pass.
//
// Master-only (see the page). It reads every program's data with the service
// client, so it belongs with the platform owner, not with super-admins.

const PAGE = 1000; // PostgREST's default max rows per response.
const MAX_ROWS = 250_000; // Backstop so a runaway table can't hang the page.

/**
 * Page through a table until a short page comes back. Every totals query here
 * is unbounded by design (the whole platform, not one program), and PostgREST
 * silently truncates at 1000 rows — a silent truncation would understate every
 * headline number with no visible symptom.
 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data } = await page(from, from + PAGE - 1);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export type PlatformTotals = {
  programs: number;
  courses: number;
  learners: number;
  enrollments: number;
  engagedLearners: number;
  /** engagedLearners / learners, 0–100. */
  engagementRate: number;
  certificates: number;
  lessonsWatched: number;
  sessionsAttended: number;
  submissions: number;
  reflections: number;
  surveysCompleted: number;
  tutorMessages: number;
  activityEvents: number;
  invitedEmails: number;
  landingSignups: number;
  staffAccounts: number;
  adminAccounts: number;
  activeLast7: number;
  activeLast30: number;
  newLearners30: number;
};

export type PlatformProgramRow = {
  slug: string;
  name: string;
  isDynamic: boolean;
  courses: number;
  learners: number;
  enrollments: number;
  engaged: number;
  engagementRate: number;
  active30: number;
  lessons: number;
  attended: number;
  submitted: number;
  certificates: number;
};

export type PlatformCourseRow = {
  slug: string;
  name: string;
  program: string;
  archived: boolean;
  enrollments: number;
  engaged: number;
  certificates: number;
};

export type PlatformTrends = {
  range: RangePreset;
  periodLabel: string;
  activeLearners: Delta;
  lessonsWatched: Delta;
  attended: Delta;
  submitted: Delta;
  enrollments: Delta;
  certificates: Delta;
};

export type PlatformAnalytics = {
  generatedAt: string;
  totals: PlatformTotals;
  programs: PlatformProgramRow[];
  courses: PlatformCourseRow[];
  /** Learner signups per month, oldest first — the platform's growth curve. */
  signupsByMonth: { month: string; count: number }[];
  trends: PlatformTrends;
};

const DAY_MS = 86_400_000;

/** Add one to the count for `key`. */
function bump(m: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  m.set(key, (m.get(key) ?? 0) + 1);
}

/** Record that `id` produced a signal in `track`. */
function bumpPair(m: Map<string, Set<string>>, track: string | null | undefined, id: string) {
  if (!track) return;
  const set = m.get(track) ?? new Set<string>();
  set.add(id);
  m.set(track, set);
}

export async function getPlatformAnalytics(
  range: RangePreset = "90d",
): Promise<PlatformAnalytics> {
  const svc = createServiceClient();
  const now = Date.now();

  // ─── Dimensions ───────────────────────────────────────────────────────────
  const [programRows, trackRows] = await Promise.all([
    fetchAll<{ id: string; slug: string; name: string; is_dynamic: boolean | null }>((f, t) =>
      svc.from("programs").select("id, slug, name, is_dynamic").range(f, t),
    ),
    fetchAll<{ program_id: string; track_slug: string; name: string | null; archived_at: string | null }>(
      (f, t) =>
        svc
          .from("track_overrides")
          .select("program_id, track_slug, name, archived_at")
          .range(f, t),
    ),
  ]);

  // ─── Learners ─────────────────────────────────────────────────────────────
  // The canonical learner predicate (engagement.ts): role student, not test,
  // not staff. Applied in the query so staff/QA logins never reach a total.
  const learnerRows = await fetchAll<{
    id: string;
    program_id: string;
    created_at: string | null;
    last_activity_at: string | null;
  }>((f, t) =>
    svc
      .from("students")
      .select("id, program_id, created_at, last_activity_at")
      .eq("role", "student")
      .eq("is_test", false)
      .eq("is_staff", false)
      .range(f, t),
  );
  // learner id → program id. Every learner-owned event is attributed through
  // this map rather than through the event row's own program_id, so each
  // program's column sums back to the platform total and events belonging to
  // staff/test accounts drop out of both.
  const programOfLearner = new Map<string, string>();
  for (const s of learnerRows) programOfLearner.set(s.id, s.program_id);

  // ─── Learner-owned activity ───────────────────────────────────────────────
  const [enrollRows, videoRows, attendRows, submitRows, reflectRows, completionRows, surveyRows] =
    await Promise.all([
      fetchAll<{ student_id: string; track_slug: string; created_at: string | null }>((f, t) =>
        svc.from("student_tracks").select("student_id, track_slug, created_at").range(f, t),
      ),
      fetchAll<{ user_id: string; track_slug: string | null }>((f, t) =>
        svc
          .from("week_progress")
          .select("user_id, track_slug")
          .not("video_watched_at", "is", null)
          .range(f, t),
      ),
      fetchAll<{ student_id: string; track: string | null }>((f, t) =>
        svc.from("attendance").select("student_id, track").range(f, t),
      ),
      fetchAll<{ student_id: string; track_slug: string | null }>((f, t) =>
        svc
          .from("submissions")
          .select("student_id, track_slug")
          .not("submitted_at", "is", null)
          .range(f, t),
      ),
      fetchAll<{ student_id: string; track_slug: string | null }>((f, t) =>
        svc
          .from("reflections")
          .select("student_id, track_slug")
          .not("submitted_at", "is", null)
          .range(f, t),
      ),
      fetchAll<{ student_id: string; track_slug: string }>((f, t) =>
        svc.from("track_completions").select("student_id, track_slug").range(f, t),
      ),
      fetchAll<{ student_id: string }>((f, t) =>
        svc
          .from("survey_responses")
          .select("student_id")
          .not("completed_at", "is", null)
          .range(f, t),
      ),
    ]);

  // ─── Counts not owned by a learner row ────────────────────────────────────
  const [publicSurveys, tutorMsgs, activityEvents, invited, landingSignups, staffCount, adminCount] =
    await Promise.all([
      svc.from("public_survey_responses").select("id", { count: "exact", head: true }),
      svc.from("tutor_messages").select("id", { count: "exact", head: true }),
      svc.from("activity_events").select("id", { count: "exact", head: true }),
      svc.from("allowed_signup_emails").select("email", { count: "exact", head: true }),
      svc.from("landing_signups").select("id", { count: "exact", head: true }),
      svc.from("students").select("id", { count: "exact", head: true }).eq("is_staff", true),
      svc
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("role", ["instructor", "admin", "super_admin"]),
    ]);

  // ─── Roll up ──────────────────────────────────────────────────────────────
  const isLearner = (id: string) => programOfLearner.has(id);

  // Per-program event tallies, keyed by the LEARNER's program.
  const lessonsByProgram = new Map<string, number>();
  const attendedByProgram = new Map<string, number>();
  const submittedByProgram = new Map<string, number>();
  const reflectedByProgram = new Map<string, number>();
  const certsByProgram = new Map<string, number>();
  const enrollByProgram = new Map<string, number>();

  // Per-course rosters + signal sets, so a course's "engaged" means engaged IN
  // THAT COURSE rather than anywhere on the platform.
  const enrollByCourse = new Map<string, Set<string>>();
  const certsByCourse = new Map<string, number>();
  const signalByCourse = new Map<string, Set<string>>();

  // Platform-wide signal sets for the engagement predicate.
  const watched = new Set<string>();
  const attended = new Set<string>();
  const submitted = new Set<string>();
  const reflected = new Set<string>();

  let lessonsWatched = 0;
  let sessionsAttended = 0;
  let submissions = 0;
  let reflections = 0;
  let certificates = 0;
  let enrollments = 0;
  let authSurveys = 0;

  for (const r of enrollRows) {
    if (!isLearner(r.student_id)) continue;
    enrollments++;
    bump(enrollByProgram, programOfLearner.get(r.student_id));
    const set = enrollByCourse.get(r.track_slug) ?? new Set<string>();
    set.add(r.student_id);
    enrollByCourse.set(r.track_slug, set);
  }
  for (const r of videoRows) {
    if (!isLearner(r.user_id)) continue;
    lessonsWatched++;
    watched.add(r.user_id);
    bump(lessonsByProgram, programOfLearner.get(r.user_id));
    bumpPair(signalByCourse, r.track_slug, r.user_id);
  }
  for (const r of attendRows) {
    if (!isLearner(r.student_id)) continue;
    sessionsAttended++;
    attended.add(r.student_id);
    bump(attendedByProgram, programOfLearner.get(r.student_id));
    bumpPair(signalByCourse, r.track, r.student_id);
  }
  for (const r of submitRows) {
    if (!isLearner(r.student_id)) continue;
    submissions++;
    submitted.add(r.student_id);
    bump(submittedByProgram, programOfLearner.get(r.student_id));
    bumpPair(signalByCourse, r.track_slug, r.student_id);
  }
  for (const r of reflectRows) {
    if (!isLearner(r.student_id)) continue;
    reflections++;
    reflected.add(r.student_id);
    bump(reflectedByProgram, programOfLearner.get(r.student_id));
    bumpPair(signalByCourse, r.track_slug, r.student_id);
  }
  for (const r of completionRows) {
    if (!isLearner(r.student_id)) continue;
    certificates++;
    bump(certsByProgram, programOfLearner.get(r.student_id));
    certsByCourse.set(r.track_slug, (certsByCourse.get(r.track_slug) ?? 0) + 1);
  }
  for (const r of surveyRows) {
    if (!isLearner(r.student_id)) continue;
    authSurveys++;
  }

  const engagedIds = new Set<string>();
  for (const id of programOfLearner.keys()) {
    if (
      isEngaged({
        watched: watched.has(id),
        attended: attended.has(id),
        submitted: submitted.has(id),
        reflected: reflected.has(id),
      })
    ) {
      engagedIds.add(id);
    }
  }

  // Recency + growth, from behaviour only. last_seen_at is written at signup,
  // so it reads a freshly-enrolled cohort as 100% active — last_activity_at is
  // the honest column (same call the program-scoped analytics makes).
  const learnersByProgram = new Map<string, number>();
  const active30ByProgram = new Map<string, number>();
  const engagedByProgram = new Map<string, number>();
  const signupsByMonth = new Map<string, number>();
  let activeLast7 = 0;
  let activeLast30 = 0;
  let newLearners30 = 0;

  for (const s of learnerRows) {
    bump(learnersByProgram, s.program_id);
    if (engagedIds.has(s.id)) bump(engagedByProgram, s.program_id);
    const last = s.last_activity_at ? Date.parse(s.last_activity_at) : 0;
    if (last && now - last <= 7 * DAY_MS) activeLast7++;
    if (last && now - last <= 30 * DAY_MS) {
      activeLast30++;
      bump(active30ByProgram, s.program_id);
    }
    if (s.created_at) {
      if (now - Date.parse(s.created_at) <= 30 * DAY_MS) newLearners30++;
      const month = s.created_at.slice(0, 7);
      signupsByMonth.set(month, (signupsByMonth.get(month) ?? 0) + 1);
    }
  }

  const coursesByProgram = new Map<string, number>();
  for (const t of trackRows) {
    if (!t.archived_at) bump(coursesByProgram, t.program_id);
  }

  const programName = new Map(programRows.map((p) => [p.id, p.name] as const));
  const rate = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

  const programs: PlatformProgramRow[] = programRows
    .map((p) => {
      const learners = learnersByProgram.get(p.id) ?? 0;
      const engaged = engagedByProgram.get(p.id) ?? 0;
      return {
        slug: p.slug,
        name: p.name,
        isDynamic: !!p.is_dynamic,
        courses: coursesByProgram.get(p.id) ?? 0,
        learners,
        enrollments: enrollByProgram.get(p.id) ?? 0,
        engaged,
        engagementRate: rate(engaged, learners),
        active30: active30ByProgram.get(p.id) ?? 0,
        lessons: lessonsByProgram.get(p.id) ?? 0,
        attended: attendedByProgram.get(p.id) ?? 0,
        submitted: submittedByProgram.get(p.id) ?? 0,
        certificates: certsByProgram.get(p.id) ?? 0,
      };
    })
    // Empty tenants (a demo org with nobody in it) would otherwise pad the
    // table with zero rows and bury the programs that carry the platform.
    .filter((p) => p.learners > 0 || p.courses > 0)
    .sort((a, b) => b.learners - a.learners || a.name.localeCompare(b.name));

  // Track slugs are globally unique, so one row per slug is correct even though
  // track_overrides is keyed (program_id, track_slug).
  const courseMeta = new Map(
    trackRows.map(
      (t) =>
        [
          t.track_slug,
          {
            name: t.name || t.track_slug,
            program: programName.get(t.program_id) ?? "—",
            archived: !!t.archived_at,
          },
        ] as const,
    ),
  );
  const courseSlugs = new Set<string>([...enrollByCourse.keys(), ...courseMeta.keys()]);
  const courses: PlatformCourseRow[] = Array.from(courseSlugs)
    .map((slug) => {
      const meta = courseMeta.get(slug);
      const roster = enrollByCourse.get(slug) ?? new Set<string>();
      const signals = signalByCourse.get(slug) ?? new Set<string>();
      let engaged = 0;
      for (const id of roster) if (signals.has(id)) engaged++;
      return {
        slug,
        name: meta?.name ?? slug,
        program: meta?.program ?? "—",
        archived: meta?.archived ?? false,
        enrollments: roster.size,
        engaged,
        certificates: certsByCourse.get(slug) ?? 0,
      };
    })
    .filter((c) => c.enrollments > 0)
    .sort((a, b) => b.enrollments - a.enrollments || a.name.localeCompare(b.name));

  const totals: PlatformTotals = {
    programs: programs.length,
    courses: trackRows.filter((t) => !t.archived_at).length,
    learners: learnerRows.length,
    enrollments,
    engagedLearners: engagedIds.size,
    engagementRate: rate(engagedIds.size, learnerRows.length),
    certificates,
    lessonsWatched,
    sessionsAttended,
    submissions,
    reflections,
    surveysCompleted: authSurveys + (publicSurveys.count ?? 0),
    tutorMessages: tutorMsgs.count ?? 0,
    activityEvents: activityEvents.count ?? 0,
    invitedEmails: invited.count ?? 0,
    landingSignups: landingSignups.count ?? 0,
    staffAccounts: staffCount.count ?? 0,
    adminAccounts: adminCount.count ?? 0,
    activeLast7,
    activeLast30,
    newLearners30,
  };

  return {
    generatedAt: new Date().toISOString(),
    totals,
    programs,
    courses,
    signupsByMonth: Array.from(signupsByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count })),
    trends: await getPlatformTrends(range, programOfLearner),
  };
}

/**
 * Period-over-period movement, platform-wide. Only metrics with a real event
 * timestamp appear here — current-state counts (total learners, total courses)
 * have no stored history, so a delta on them would be invented.
 */
async function getPlatformTrends(
  range: RangePreset,
  programOfLearner: Map<string, string>,
): Promise<PlatformTrends> {
  const svc = createServiceClient();
  const { current, previous } = resolveRange(range);
  const spanStart = previous.start.toISOString();
  const spanEnd = current.end.toISOString();

  // One pass per table spanning BOTH windows, bucketed in memory.
  const [videoRows, attendRows, submitRows, enrollRows, completionRows] = await Promise.all([
    fetchAll<{ user_id: string; video_watched_at: string | null }>((f, t) =>
      svc
        .from("week_progress")
        .select("user_id, video_watched_at")
        .gte("video_watched_at", spanStart)
        .lt("video_watched_at", spanEnd)
        .range(f, t),
    ),
    fetchAll<{ student_id: string; checked_in_at: string | null }>((f, t) =>
      svc
        .from("attendance")
        .select("student_id, checked_in_at")
        .gte("checked_in_at", spanStart)
        .lt("checked_in_at", spanEnd)
        .range(f, t),
    ),
    fetchAll<{ student_id: string; submitted_at: string | null }>((f, t) =>
      svc
        .from("submissions")
        .select("student_id, submitted_at")
        .gte("submitted_at", spanStart)
        .lt("submitted_at", spanEnd)
        .range(f, t),
    ),
    fetchAll<{ student_id: string; created_at: string | null }>((f, t) =>
      svc
        .from("student_tracks")
        .select("student_id, created_at")
        .gte("created_at", spanStart)
        .lt("created_at", spanEnd)
        .range(f, t),
    ),
    fetchAll<{ student_id: string; completed_at: string | null }>((f, t) =>
      svc
        .from("track_completions")
        .select("student_id, completed_at")
        .gte("completed_at", spanStart)
        .lt("completed_at", spanEnd)
        .range(f, t),
    ),
  ]);

  const inPeriod = (ts: string | null, p: Period) =>
    !!ts && ts >= p.start.toISOString() && ts < p.end.toISOString();

  const activeCur = new Set<string>();
  const activePrev = new Set<string>();
  let vCur = 0, vPrev = 0, aCur = 0, aPrev = 0, sCur = 0, sPrev = 0;
  let eCur = 0, ePrev = 0, cCur = 0, cPrev = 0;

  const tally = (
    id: string,
    ts: string | null,
    onCur: () => void,
    onPrev: () => void,
    active = true,
  ) => {
    if (!programOfLearner.has(id)) return;
    if (inPeriod(ts, current)) {
      onCur();
      if (active) activeCur.add(id);
    } else if (inPeriod(ts, previous)) {
      onPrev();
      if (active) activePrev.add(id);
    }
  };

  for (const r of videoRows) tally(r.user_id, r.video_watched_at, () => vCur++, () => vPrev++);
  for (const r of attendRows) tally(r.student_id, r.checked_in_at, () => aCur++, () => aPrev++);
  for (const r of submitRows) tally(r.student_id, r.submitted_at, () => sCur++, () => sPrev++);
  // Enrolling and finishing are not "did the work" signals, so they move their
  // own counters without touching the active-learner set.
  for (const r of enrollRows) tally(r.student_id, r.created_at, () => eCur++, () => ePrev++, false);
  for (const r of completionRows)
    tally(r.student_id, r.completed_at, () => cCur++, () => cPrev++, false);

  return {
    range,
    periodLabel: formatPeriod(current),
    activeLearners: delta(activeCur.size, activePrev.size),
    lessonsWatched: delta(vCur, vPrev),
    attended: delta(aCur, aPrev),
    submitted: delta(sCur, sPrev),
    enrollments: delta(eCur, ePrev),
    certificates: delta(cCur, cPrev),
  };
}
