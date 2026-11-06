import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { participantLastActivity, type ParticipantActivity } from "./participant-progress";

type Enrollment = { programId: string; courseSlug: string };
type Learner = { id: string; enrollments: Enrollment[] };
type Activity = { at: string | null; state: "recorded" | "none_recorded" | "unavailable" };
export type LearnerWeeklyMilestones = {
  weekNumber: number | null;
  submission: Activity;
  reflection: Activity;
  markedWatched: Activity;
};
type Result = { lastActivity: Activity; weeklyMilestones: LearnerWeeklyMilestones[] };

function projectActivity(activities: ParticipantActivity[], learnerId: string, courseSlug: string, asOf: Date): Activity {
  const result = participantLastActivity(activities, learnerId, courseSlug, asOf);
  return { at: result.at, state: result.status };
}

// Internal only: directory must come from the authorized loader, after pagination.
// Sources identify actions by learner + course, not historical enrollment attempt.
export async function loadLearnerActivity<T extends Learner>(
  db: ReturnType<typeof createServiceClient>, directory: T[], asOf = new Date(),
): Promise<Array<Omit<T, "enrollments"> & { enrollments: Array<Omit<T["enrollments"][number], keyof Result> & Result> }>> {
  const courses = new Map<string, { programId: string; courseSlug: string; learnerIds: Set<string> }>();
  for (const learner of directory) for (const enrollment of learner.enrollments) {
    const key = `${enrollment.programId}:${enrollment.courseSlug}`;
    const offering = courses.get(key) ?? { programId: enrollment.programId, courseSlug: enrollment.courseSlug, learnerIds: new Set<string>() };
    offering.learnerIds.add(learner.id);
    courses.set(key, offering);
  }
  const results = new Map<string, Map<string, Result>>();
  for (const [key, offering] of courses) {
    const { programId, courseSlug, learnerIds } = offering;
    const ids = [...learnerIds];
    const byLearner = new Map<string, Result>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const activities: ParticipantActivity[] = [];
      for (const source of ["submissions", "reflections", "week_progress"] as const) {
        const video = source === "week_progress";
        let cursor: string | null = null;
        while (true) {
          let query = db.from(source)
            .select(video ? "id,program_id,user_id,track_slug,week_number,video_watched_at" : "id,program_id,student_id,track_slug,week_number,submitted_at")
            .eq("program_id", programId).eq("track_slug", courseSlug).in(video ? "user_id" : "student_id", batch).order("id").limit(500);
          if (cursor !== null) query = query.gt("id", cursor);
          const { data, error } = await query;
          if (error || !Array.isArray(data)) throw new Error("Unable to load complete learner activity.");
          if (!data.length) break;
          for (const row of data) {
            const record: Record<string, unknown> = row;
            const learnerId = record[video ? "user_id" : "student_id"];
            if (
              typeof learnerId !== "string" || !batch.includes(learnerId) ||
              record.program_id !== programId || record.track_slug !== courseSlug
            ) throw new Error("Learner activity scope mismatch.");
            const timestamp = record[video ? "video_watched_at" : "submitted_at"];
            // Never interpret timezone-free values using the server's local zone.
            const at = timestamp === null ? null : typeof timestamp === "string" && /(Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : "invalid";
            const week = record.week_number;
            // Preserve unmapped historical activity without inventing a week.
            const weekNumber = typeof week === "number" && Number.isSafeInteger(week) && week > 0 ? week : 0;
            activities.push({ learnerId, courseSlug, kind: video ? "video" : source === "submissions" ? "submission" : "reflection", weekNumber, at });
          }
          const next: unknown = data[data.length - 1].id;
          if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner activity pagination did not advance.");
          cursor = next;
        }
      }
      for (const learnerId of batch) {
        const scoped = activities.filter(activity => activity.learnerId === learnerId);
        const weeks = [...new Set(scoped.map(activity => activity.weekNumber))].sort((a, b) =>
          a === 0 ? 1 : b === 0 ? -1 : a - b);
        const weeklyMilestones = weeks.map(week => {
          const records = scoped.filter(activity => activity.weekNumber === week);
          const milestone = (kind: ParticipantActivity["kind"]) => projectActivity(records.filter(activity => activity.kind === kind), learnerId, courseSlug, asOf);
          return { weekNumber: week || null, submission: milestone("submission"), reflection: milestone("reflection"), markedWatched: milestone("video") };
        });
        byLearner.set(learnerId, { lastActivity: projectActivity(scoped, learnerId, courseSlug, asOf), weeklyMilestones });
      }
    }
    results.set(key, byLearner);
  }
  return directory.map(learner => ({ ...learner, enrollments: learner.enrollments.map(enrollment => ({
    ...(enrollment as T["enrollments"][number]), ...results.get(`${enrollment.programId}:${enrollment.courseSlug}`)!.get(learner.id)!,
  })) }));
}
