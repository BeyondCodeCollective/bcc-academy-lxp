"use server";

import { requireCapability } from "./actions-shared";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { isEngaged } from "@/lib/analytics/engagement";

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
  videosWatched: number;
  attended: number;
  submitted: number;
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
    .eq("is_test", false);
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
      svc.from("week_progress").select("user_id").in("user_id", studentIds).not("video_watched_at", "is", null),
      svc.from("attendance").select("student_id").in("student_id", studentIds),
      svc.from("submissions").select("student_id").in("student_id", studentIds),
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
  for (const r of (attendanceRows.data ?? []) as { student_id: string }[]) {
    attendanceByUser.set(r.student_id, (attendanceByUser.get(r.student_id) ?? 0) + 1);
  }
  const submissionsByUser = new Map<string, number>();
  for (const r of (submissionRows.data ?? []) as { student_id: string }[]) {
    submissionsByUser.set(r.student_id, (submissionsByUser.get(r.student_id) ?? 0) + 1);
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
