import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { MvpAttendanceReview } from "./attendance-verification";

// Internal loader: callers must first authorize the offering and its roster.
// Read every revision; the verifier chooses the latest evidence as of evaluation.
export async function loadMvpAttendanceReviews(
  db: ReturnType<typeof createServiceClient>, programId: string, courseSlug: string, learnerIds: string[],
): Promise<MvpAttendanceReview[]> {
  const ids = [...new Set(learnerIds)];
  const reviews: MvpAttendanceReview[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    let cursor: string | null = null;
    while (true) {
      let query = db.from("mvp_attendance_reviews")
        .select("id, revision, program_id, student_id, track_slug, week_number, session_number, session_held_at, eligibility, eligibility_basis, outcome, recorded_by, recorded_at")
        .eq("program_id", programId).eq("track_slug", courseSlug)
        .in("student_id", ids.slice(offset, offset + 100)).order("id").limit(500);
      if (cursor !== null) query = query.gt("id", cursor);
      const { data, error } = await query;
      // Before migration deployment, no review evidence can establish absence.
      // Discard any partial history; permission/network errors still fail closed.
      if (error?.code === "PGRST205" || error?.code === "42P01") return [];
      if (error || !Array.isArray(data)) throw new Error("Unable to load complete attendance review evidence.");
      if (!data.length) break;
      const next: string = data[data.length - 1].id;
      if (!next || (cursor !== null && next <= cursor)) throw new Error("Attendance review pagination did not advance.");
      reviews.push(...data as MvpAttendanceReview[]);
      cursor = next;
    }
  }
  return reviews;
}
