"use server";

import { requireCapability } from "./actions-shared";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { isEngaged } from "@/lib/analytics/engagement";
import {
  type RangePreset,
  type Delta,
  type Period,
  resolveRange,
  delta,
  formatPeriod,
} from "@/lib/analytics/period";

/** Whole-years age from a YYYY-MM-DD birth date, or null. */
function ageFromDob(dob: string | null): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

// Program-level engagement analytics for the admin "Analytics" tab. Scoped to
// the CURRENT program for every role (super-admins included) so the view always
// reflects the program switcher — NOT the cross-program firehose that Survey
// Insights shows. Computed live from base tables.

export type EngagementLearner = {
  email: string;
  name: string;
  zip: string | null;
  state: string | null;
  dateOfBirth: string | null;
  age: number | null;
  signedUp: string | null;
  lastActive: string | null;
  // Track slugs this learner is enrolled in (from student_tracks). Lets the
  // Analytics tab filter/export by a single track — a program-scoped export
  // silently mixed every track's learners together, so a "Security+ zips"
  // export came back partial and nobody could tell why.
  tracks: string[];
  // Program-wide totals across every track this learner touches.
  videosWatched: number;
  attended: number;
  submitted: number;
  // Same three signals broken out per track slug, so the Analytics table/CSV can
  // show track-scoped counts when a track is selected. A program-wide "attended"
  // over-reports a single track (a Security+ learner who also does MASS showed 7
  // against a 4-session track).
  byTrack: Record<string, { videosWatched: number; attended: number; submitted: number }>;
  surveys: number;
  // Which surveys this learner completed, so the count in the table drills
  // through to the actual list ("what 4 surveys did they take?") instead of
  // being a dead number.
  surveyList: { type: string; completedAt: string | null }[];
};

export type EngagementAnalytics = {
  programName: string;
  funnel: { invited: number; activated: number; engaged: number };
  learners: EngagementLearner[];
  // Tracks in this program, for the Analytics tab's track filter. Slug + display
  // name so the dropdown reads "CompTIA Security+" but filters on the slug.
  trackOptions: { slug: string; name: string }[];
};

export async function getEngagementAnalytics(): Promise<EngagementAnalytics> {
  const { svc } = await requireCapability("view_insights");
  const program = await getProgram();
  const scope = await resolveProgramScope(program.slug);
  const ids = scope.ids;
  const trackSlugs = program.tracks.map((t) => t.slug);

  const trackOptions = program.tracks.map((t) => ({ slug: t.slug, name: t.name }));

  const empty: EngagementAnalytics = {
    programName: program.name,
    funnel: { invited: 0, activated: 0, engaged: 0 },
    learners: [],
    trackOptions,
  };
  if (ids.length === 0) return empty;

  // Learners only — admins/instructors/super-admins never watch course videos
  // or get marked present, so counting them as "created an account" tanks the
  // engaged rate and makes a healthy cohort read as mostly-inactive. is_test
  // hides internal QA logins the same way.
  const { data: students } = await svc
    .from("students")
    .select("id, first_name, last_name, email, created_at, last_seen_at, zip, state, date_of_birth")
    .in("program_id", ids)
    .eq("role", "student")
    .eq("is_test", false)
    // Staff (BGC/BCC employees) are not learners — they only see Lunch & Learns,
    // so they must never inflate the activation funnel or the per-learner table.
    .eq("is_staff", false);
  const studs = (students ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    created_at: string | null;
    last_seen_at: string | null;
    zip: string | null;
    state: string | null;
    date_of_birth: string | null;
  }[];
  const studentIds = studs.map((s) => s.id);

  // Engagement events scoped to these learners + the program's allowlist.
  // Empty .in([]) is safe (returns no rows), so no need to guard each call.
  const [videoRows, attendanceRows, submissionRows, reflectionRows, surveyRows, allowRows, testEmailRows, studentTrackRows] =
    await Promise.all([
      // Only a WATCHED video counts — a week_progress row can exist without
      // video_watched_at. (Matches getLearnerActivity; otherwise Engagement is
      // inflated and disagrees with the BCC-wide analytics.)
      // Select the track column on each activity table so counts can be scoped
      // per-track for the Analytics track filter. NOTE the column name differs:
      // `attendance` uses `track`, but week_progress/submissions/reflections use
      // `track_slug`. Mixing these up silently returns nothing.
      svc.from("week_progress").select("user_id, track_slug").in("user_id", studentIds).not("video_watched_at", "is", null),
      svc.from("attendance").select("student_id, track").in("student_id", studentIds).in("program_id", ids),
      svc.from("submissions").select("student_id, track_slug").in("student_id", studentIds),
      // Reflections are a "did the work" signal too — omitting them undercounted
      // engagement and disagreed with the Insights page's definition.
      svc.from("reflections").select("student_id").in("student_id", studentIds).not("submitted_at", "is", null),
      svc.from("survey_responses").select("student_id, survey_type, completed_at").in("student_id", studentIds).not("completed_at", "is", null),
      svc.from("allowed_signup_emails").select("email").in("track_slug", trackSlugs),
      // Emails of internal QA accounts, so they're subtracted from "Invited"
      // too — otherwise Invited counts a test allowlist entry that "Created"
      // (is_test filtered) doesn't, and the funnel reads N+1 → N.
      svc.from("students").select("email").in("program_id", ids).eq("is_test", true),
      // Per-learner track enrollment — the canonical students↔tracks mapping,
      // so the Analytics filter scopes to a real roster (not attendance/allowlist
      // proxies).
      svc.from("student_tracks").select("student_id, track_slug").in("student_id", studentIds),
    ]);

  // Per-(student, track) tallies for the three engagement signals, so a
  // track-filtered view reports that track's activity instead of the sum across
  // every track a learner is in. `bump` increments the inner track counter.
  const bump = (m: Map<string, Map<string, number>>, id: string, track: string | null) => {
    if (!track) return;
    const inner = m.get(id) ?? new Map<string, number>();
    inner.set(track, (inner.get(track) ?? 0) + 1);
    m.set(id, inner);
  };
  const videosByUserTrack = new Map<string, Map<string, number>>();
  const attendanceByUserTrack = new Map<string, Map<string, number>>();
  const submissionsByUserTrack = new Map<string, Map<string, number>>();
  for (const r of (videoRows.data ?? []) as { user_id: string; track_slug: string | null }[]) {
    bump(videosByUserTrack, r.user_id, r.track_slug);
  }

  const videosByUser = new Map<string, number>();
  for (const r of (videoRows.data ?? []) as { user_id: string }[]) {
    videosByUser.set(r.user_id, (videosByUser.get(r.user_id) ?? 0) + 1);
  }
  // Keep the full per-learner survey list (type + date), not just a count, so
  // the table's Surveys cell can drill through to "which ones did they take?".
  const surveysByStudent = new Map<string, { type: string; completedAt: string | null }[]>();
  for (const r of (surveyRows.data ?? []) as { student_id: string; survey_type: string; completed_at: string | null }[]) {
    const list = surveysByStudent.get(r.student_id) ?? [];
    list.push({ type: r.survey_type, completedAt: r.completed_at });
    surveysByStudent.set(r.student_id, list);
  }
  // Per-learner attendance + submissions, so the table can show WHY someone is
  // counted "engaged" when they have 0 videos (engaged = watched OR attended OR
  // submitted). Without these columns the funnel total looks contradictory.
  const attendanceByUser = new Map<string, number>();
  for (const r of (attendanceRows.data ?? []) as { student_id: string; track: string | null }[]) {
    attendanceByUser.set(r.student_id, (attendanceByUser.get(r.student_id) ?? 0) + 1);
    bump(attendanceByUserTrack, r.student_id, r.track);
  }
  const submissionsByUser = new Map<string, number>();
  for (const r of (submissionRows.data ?? []) as { student_id: string; track_slug: string | null }[]) {
    submissionsByUser.set(r.student_id, (submissionsByUser.get(r.student_id) ?? 0) + 1);
    bump(submissionsByUserTrack, r.student_id, r.track_slug);
  }
  const tracksByStudent = new Map<string, string[]>();
  for (const r of (studentTrackRows.data ?? []) as { student_id: string; track_slug: string }[]) {
    const list = tracksByStudent.get(r.student_id) ?? [];
    list.push(r.track_slug);
    tracksByStudent.set(r.student_id, list);
  }

  // Canonical engagement (src/lib/analytics/engagement.ts): did-the-work =
  // attendance OR video OR submission OR reflection. Build the per-learner signal
  // sets, then apply the shared predicate so this count means the same thing as
  // every other surface.
  const watchedSet = new Set(((videoRows.data ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const attendedSet = new Set(((attendanceRows.data ?? []) as { student_id: string }[]).map((r) => r.student_id));
  const submittedSet = new Set(((submissionRows.data ?? []) as { student_id: string }[]).map((r) => r.student_id));
  const reflectedSet = new Set(((reflectionRows.data ?? []) as { student_id: string }[]).map((r) => r.student_id));
  const engaged = new Set<string>(
    studentIds.filter((id) =>
      isEngaged({
        watched: watchedSet.has(id),
        attended: attendedSet.has(id),
        submitted: submittedSet.has(id),
        reflected: reflectedSet.has(id),
      }),
    ),
  );

  const testEmails = new Set(
    ((testEmailRows.data ?? []) as { email: string }[])
      .map((r) => r.email?.toLowerCase())
      .filter(Boolean),
  );
  const invitedEmails = new Set(
    ((allowRows.data ?? []) as { email: string }[])
      .map((r) => r.email?.toLowerCase())
      .filter((e): e is string => !!e && !testEmails.has(e)),
  );
  const invited = invitedEmails.size;

  // Fold a learner's three per-track count maps into one { slug: {v,a,s} } record.
  const byTrackFor = (id: string) => {
    const slugs = new Set<string>([
      ...(videosByUserTrack.get(id)?.keys() ?? []),
      ...(attendanceByUserTrack.get(id)?.keys() ?? []),
      ...(submissionsByUserTrack.get(id)?.keys() ?? []),
    ]);
    const out: Record<string, { videosWatched: number; attended: number; submitted: number }> = {};
    for (const slug of slugs) {
      out[slug] = {
        videosWatched: videosByUserTrack.get(id)?.get(slug) ?? 0,
        attended: attendanceByUserTrack.get(id)?.get(slug) ?? 0,
        submitted: submissionsByUserTrack.get(id)?.get(slug) ?? 0,
      };
    }
    return out;
  };

  const learners: EngagementLearner[] = studs
    .map((s) => ({
      email: s.email,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
      zip: s.zip ?? null,
      state: s.state ?? null,
      dateOfBirth: s.date_of_birth ?? null,
      age: ageFromDob(s.date_of_birth),
      signedUp: s.created_at ? s.created_at.slice(0, 10) : null,
      lastActive: s.last_seen_at ? s.last_seen_at.slice(0, 10) : null,
      tracks: tracksByStudent.get(s.id) ?? [],
      videosWatched: videosByUser.get(s.id) ?? 0,
      attended: attendanceByUser.get(s.id) ?? 0,
      submitted: submissionsByUser.get(s.id) ?? 0,
      byTrack: byTrackFor(s.id),
      surveys: (surveysByStudent.get(s.id) ?? []).length,
      surveyList: (surveysByStudent.get(s.id) ?? []).sort((a, b) =>
        (a.completedAt ?? "").localeCompare(b.completedAt ?? ""),
      ),
    }))
    // Rank by TOTAL engagement (videos + attendance + submissions), not videos
    // alone — a live-session track like Security+ engages via attendance, so a
    // videos-only sort buried every active learner under a wall of zeros.
    .sort(
      (a, b) =>
        b.videosWatched + b.attended + b.submitted -
          (a.videosWatched + a.attended + a.submitted) ||
        (b.lastActive ?? "").localeCompare(a.lastActive ?? ""),
    );

  return {
    programName: program.name,
    funnel: { invited, activated: studs.length, engaged: engaged.size },
    learners,
    trackOptions,
  };
}

// ─── Compare-to-previous trends ──────────────────────────────────────────────
// A separate, range-aware layer that period-compares only the metrics with a
// real event timestamp. Kept apart from getEngagementAnalytics (which is
// current-state) so the funnel/table stay untouched. Each metric is counted for
// the current window and the equal-length window before it, via a .gte/.lt pair
// on the event's own timestamp column.

export type EngagementTrends = {
  rangeLabel: string;
  periodLabel: string;
  activeLearners: Delta;
  lessonsWatched: Delta;
  attended: Delta;
  submitted: Delta;
};

export async function getEngagementTrends(
  preset: RangePreset,
): Promise<EngagementTrends> {
  const { svc } = await requireCapability("view_insights");
  const program = await getProgram();
  const scope = await resolveProgramScope(program.slug);
  const ids = scope.ids;
  const { current, previous } = resolveRange(preset);

  const empty = (): Delta => delta(0, 0);
  const base: EngagementTrends = {
    rangeLabel: preset,
    periodLabel: formatPeriod(current),
    activeLearners: empty(),
    lessonsWatched: empty(),
    attended: empty(),
    submitted: empty(),
  };
  if (ids.length === 0) return base;

  // Learners only, matching getEngagementAnalytics' exclusions so the two
  // surfaces agree on who counts.
  const { data: students } = await svc
    .from("students")
    .select("id")
    .in("program_id", ids)
    .eq("role", "student")
    .eq("is_test", false)
    .eq("is_staff", false);
  const studentIds = ((students ?? []) as { id: string }[]).map((s) => s.id);
  if (studentIds.length === 0) return base;

  const iso = (d: Date) => d.toISOString();

  // Fetch the (id, timestamp) rows once per event, spanning both windows, then
  // bucket in memory — one round-trip per table instead of four.
  const spanStart = iso(previous.start);
  const spanEnd = iso(current.end);
  const [videoRows, attendRows, submitRows] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, video_watched_at")
      .in("user_id", studentIds)
      .gte("video_watched_at", spanStart)
      .lt("video_watched_at", spanEnd),
    svc
      .from("attendance")
      .select("student_id, checked_in_at")
      .in("student_id", studentIds)
      .in("program_id", ids)
      .gte("checked_in_at", spanStart)
      .lt("checked_in_at", spanEnd),
    svc
      .from("submissions")
      .select("student_id, submitted_at")
      .in("student_id", studentIds)
      .gte("submitted_at", spanStart)
      .lt("submitted_at", spanEnd),
  ]);

  const inPeriod = (ts: string | null, p: Period) =>
    !!ts && ts >= iso(p.start) && ts < iso(p.end);

  // Count events + collect distinct active learners, per window.
  let vCur = 0, vPrev = 0, aCur = 0, aPrev = 0, sCur = 0, sPrev = 0;
  const activeCur = new Set<string>();
  const activePrev = new Set<string>();

  for (const r of (videoRows.data ?? []) as { user_id: string; video_watched_at: string | null }[]) {
    if (inPeriod(r.video_watched_at, current)) { vCur++; activeCur.add(r.user_id); }
    else if (inPeriod(r.video_watched_at, previous)) { vPrev++; activePrev.add(r.user_id); }
  }
  for (const r of (attendRows.data ?? []) as { student_id: string; checked_in_at: string | null }[]) {
    if (inPeriod(r.checked_in_at, current)) { aCur++; activeCur.add(r.student_id); }
    else if (inPeriod(r.checked_in_at, previous)) { aPrev++; activePrev.add(r.student_id); }
  }
  for (const r of (submitRows.data ?? []) as { student_id: string; submitted_at: string | null }[]) {
    if (inPeriod(r.submitted_at, current)) { sCur++; activeCur.add(r.student_id); }
    else if (inPeriod(r.submitted_at, previous)) { sPrev++; activePrev.add(r.student_id); }
  }

  return {
    rangeLabel: preset,
    periodLabel: formatPeriod(current),
    activeLearners: delta(activeCur.size, activePrev.size),
    lessonsWatched: delta(vCur, vPrev),
    attended: delta(aCur, aPrev),
    submitted: delta(sCur, sPrev),
  };
}
