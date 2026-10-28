import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { participantLastActivity, type ParticipantActivity } from "./participant-progress";

type Enrollment = { programId: string; courseSlug: string };
type Learner = { id: string; enrollments: Enrollment[] };
type Activity = { at: string | null; state: "recorded" | "none_recorded" | "unavailable" };

// Internal only: directory must come from the authorized loader, after pagination.
// Sources identify actions by learner + course, not historical enrollment attempt.
export async function loadLearnerActivity<T extends Learner>(
  db: ReturnType<typeof createServiceClient>, directory: T[], asOf = new Date(),
): Promise<Array<Omit<T, "enrollments"> & { enrollments: Array<Omit<T["enrollments"][number], "lastActivity"> & { lastActivity: Activity }> }>> {
  const courses = new Map<string, Set<string>>();
  for (const learner of directory) for (const enrollment of learner.enrollments) {
    const ids = courses.get(enrollment.courseSlug) ?? new Set<string>();
    ids.add(learner.id); courses.set(enrollment.courseSlug, ids);
  }
  const results = new Map<string, Map<string, Activity>>();
  for (const [courseSlug, selected] of courses) {
    const ids = [...selected];
    const byLearner = new Map<string, Activity>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const activities: ParticipantActivity[] = [];
      for (const source of ["submissions", "reflections", "week_progress"] as const) {
        const video = source === "week_progress";
        let cursor: string | null = null;
        while (true) {
          let query = db.from(source)
            .select(video ? "id,user_id,track_slug,video_watched_at" : "id,student_id,track_slug,submitted_at")
            .eq("track_slug", courseSlug).in(video ? "user_id" : "student_id", batch).order("id").limit(500);
          if (cursor !== null) query = query.gt("id", cursor);
          const { data, error } = await query;
          if (error || !Array.isArray(data)) throw new Error("Unable to load complete learner activity.");
          if (!data.length) break;
          for (const row of data) {
            const record: Record<string, unknown> = row;
            const learnerId = record[video ? "user_id" : "student_id"];
            if (typeof learnerId !== "string" || !batch.includes(learnerId) || record.track_slug !== courseSlug) throw new Error("Learner activity scope mismatch.");
            const timestamp = record[video ? "video_watched_at" : "submitted_at"];
            // Never interpret timezone-free values using the server's local zone.
            const at = timestamp === null ? null : typeof timestamp === "string" && /(Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : "invalid";
            activities.push({ learnerId, courseSlug, kind: video ? "video" : source === "submissions" ? "submission" : "reflection", weekNumber: 0, at });
          }
          const next: unknown = data[data.length - 1].id;
          if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner activity pagination did not advance.");
          cursor = next;
        }
      }
      for (const learnerId of batch) {
        const activity = participantLastActivity(activities, learnerId, courseSlug, asOf);
        byLearner.set(learnerId, { at: activity.at, state: activity.status });
      }
    }
    results.set(courseSlug, byLearner);
  }
  return directory.map(learner => ({ ...learner, enrollments: learner.enrollments.map(enrollment => ({
    ...(enrollment as T["enrollments"][number]), lastActivity: results.get(enrollment.courseSlug)!.get(learner.id)!,
  })) }));
}
