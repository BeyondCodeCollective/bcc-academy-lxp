"use server";

import { requireCapability } from "./actions-shared";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";

// Program-level engagement analytics for the admin "Analytics" tab. Scoped to
// the CURRENT program for every role (super-admins included) so the view always
// reflects the program switcher — NOT the cross-program firehose that Survey
// Insights shows. Computed live from base tables.

export type EngagementLearner = {
  email: string;
  name: string;
  signedUp: string | null;
  lastActive: string | null;
  videosWatched: number;
  surveys: number;
};

export type EngagementAnalytics = {
  programName: string;
  funnel: { invited: number; activated: number; engaged: number };
  learners: EngagementLearner[];
};

export async function getEngagementAnalytics(): Promise<EngagementAnalytics> {
  const { svc } = await requireCapability("view_insights");
  const program = await getProgram();
  const scope = await resolveProgramScope(program.slug);
  const ids = scope.ids;
  const trackSlugs = program.tracks.map((t) => t.slug);

  const empty: EngagementAnalytics = {
    programName: program.name,
    funnel: { invited: 0, activated: 0, engaged: 0 },
    learners: [],
  };
  if (ids.length === 0) return empty;

  const { data: students } = await svc
    .from("students")
    .select("id, first_name, last_name, email, created_at, last_seen_at")
    .in("program_id", ids);
  const studs = (students ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    created_at: string | null;
    last_seen_at: string | null;
  }[];
  const studentIds = studs.map((s) => s.id);

  // Engagement events scoped to these learners + the program's allowlist.
  // Empty .in([]) is safe (returns no rows), so no need to guard each call.
  const [videoRows, attendanceRows, submissionRows, surveyRows, allowRows] =
    await Promise.all([
      svc.from("week_progress").select("user_id").in("user_id", studentIds),
      svc.from("attendance").select("student_id").in("student_id", studentIds),
      svc.from("submissions").select("student_id").in("student_id", studentIds),
      svc.from("survey_responses").select("student_id").in("student_id", studentIds),
      svc.from("allowed_signup_emails").select("email").in("track_slug", trackSlugs),
    ]);

  const videosByUser = new Map<string, number>();
  for (const r of (videoRows.data ?? []) as { user_id: string }[]) {
    videosByUser.set(r.user_id, (videosByUser.get(r.user_id) ?? 0) + 1);
  }
  const surveysByStudent = new Map<string, number>();
  for (const r of (surveyRows.data ?? []) as { student_id: string }[]) {
    surveysByStudent.set(r.student_id, (surveysByStudent.get(r.student_id) ?? 0) + 1);
  }

  const engaged = new Set<string>();
  for (const r of (videoRows.data ?? []) as { user_id: string }[]) engaged.add(r.user_id);
  for (const r of (attendanceRows.data ?? []) as { student_id: string }[]) engaged.add(r.student_id);
  for (const r of (submissionRows.data ?? []) as { student_id: string }[]) engaged.add(r.student_id);

  const invited = new Set(
    ((allowRows.data ?? []) as { email: string }[])
      .map((r) => r.email?.toLowerCase())
      .filter(Boolean),
  ).size;

  const learners: EngagementLearner[] = studs
    .map((s) => ({
      email: s.email,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
      signedUp: s.created_at ? s.created_at.slice(0, 10) : null,
      lastActive: s.last_seen_at ? s.last_seen_at.slice(0, 10) : null,
      videosWatched: videosByUser.get(s.id) ?? 0,
      surveys: surveysByStudent.get(s.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.videosWatched - a.videosWatched ||
        (b.lastActive ?? "").localeCompare(a.lastActive ?? ""),
    );

  return {
    programName: program.name,
    funnel: { invited, activated: studs.length, engaged: engaged.size },
    learners,
  };
}
