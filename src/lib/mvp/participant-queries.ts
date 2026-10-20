import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { MvpProgramRow } from "./types";
import type { MvpAttendanceRecord, MvpSessionSlot } from "./milestones";
import { verifyMvpMissedSessions, type MvpAttendanceReview } from "./attendance-verification";
import { calculateParticipantProgress, getParticipantProgressPolicy, participantLastActivity, type ParticipantActivity } from "./participant-progress";

// Internal only: invoke AFTER roster permissions, offering/date/location and
// learner-status filters. Contacts are never read by the default dashboard.
export async function loadMvpParticipants(db: ReturnType<typeof createServiceClient>, input: {
  offering: MvpProgramRow; programSlug: string; learnerIds: string[]; asOf: Date;
  heldSessions: MvpSessionSlot[] | null; attendance: MvpAttendanceRecord[]; reviews: readonly MvpAttendanceReview[];
  activeByLearner: ReadonlyMap<string, boolean | null>;
}) {
  const courseSlug = input.offering.courseSlug!;
  const ids = [...new Set(input.learnerIds)];
  type Profile = { id: string; first_name: string | null; last_name: string | null; email: string | null };
  const profiles = new Map<string, Profile>();
  const activities: ParticipantActivity[] = [];
  // Sequential batches cap concurrency and keep every cursor scoped. No raw
  // submissions, reflection answers, video URLs or assessment answers are read.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    for (const source of ["students", "submissions", "reflections", "week_progress"] as const) {
      let cursor: string | null = null;
      while (true) {
        const video = source === "week_progress";
        let query = source === "students"
          ? db.from(source).select("id, first_name, last_name, email").in("id", batch)
          : db.from(source).select(video ? "id,user_id,track_slug,week_number,video_watched_at" : "id,student_id,track_slug,week_number,submitted_at")
            .eq("track_slug", courseSlug).in(video ? "user_id" : "student_id", batch);
        query = query.order("id").limit(500);
        if (cursor !== null) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to load complete participant evidence.");
        if (!data.length) break;
        const next: string = data[data.length - 1].id;
        if (!next || (cursor !== null && next <= cursor)) throw new Error("Participant pagination did not advance.");
        if (source === "students") {
          for (const profile of data as unknown as Profile[]) if (batch.includes(profile.id)) profiles.set(profile.id, profile);
        } else {
          for (const record of data as unknown as Array<{ student_id?: string; user_id?: string; track_slug: string; week_number: number; submitted_at?: string | null; video_watched_at?: string | null }>) {
            const learnerId = (video ? record.user_id : record.student_id)!;
            if (batch.includes(learnerId) && record.track_slug === courseSlug) activities.push({ learnerId, courseSlug,
              kind: video ? "video" : source === "submissions" ? "submission" : "reflection", weekNumber: record.week_number,
              at: (video ? record.video_watched_at : record.submitted_at) ?? null });
          }
        }
        cursor = next;
      }
    }
  }
  const policy = getParticipantProgressPolicy(input.programSlug, courseSlug);
  return ids.map(learnerId => {
    const profile = profiles.get(learnerId);
    if (!profile) throw new Error("A selected participant profile is unavailable.");
    const progress = calculateParticipantProgress({ programSlug: input.programSlug, courseSlug, learnerId,
      asOf: input.asOf, heldSessions: input.heldSessions, policy, activities,
      attendance: (weekNumber, sessionNumber) => {
        const slot = input.heldSessions?.find(s => s.weekNumber === weekNumber && s.sessionNumber === sessionNumber);
        if (!slot) return null;
        const review = verifyMvpMissedSessions({ programId: input.offering.programId, courseSlug, learnerId,
          heldRequiredSessions: [slot], reviews: input.reviews, attendance: input.attendance, asOf: input.asOf });
        // Complete reviews are authoritative; missing/conflicting reviews do
        // not become absences or permit attendance entry times to imply activity.
        return review.finalizedAttendance ? review.finalizedAttendance.attended === 1 : null;
      },
    });
    return { learnerId, programId: input.offering.programId, programName: input.offering.programName,
      courseSlug, courseName: input.offering.courseName, programRowId: input.offering.id,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null,
      email: profile.email, active: input.activeByLearner.get(learnerId) ?? null,
      caughtUp: progress, lastActivity: participantLastActivity(activities, learnerId, courseSlug, input.asOf) };
  });
}
