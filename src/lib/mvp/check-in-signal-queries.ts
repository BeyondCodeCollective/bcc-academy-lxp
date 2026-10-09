import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { MvpSignalPolicy, MvpExamEvidence, MvpVideoEvidence } from "./check-in-signals";

// Called only with an authorized course roster. Exam IDs require an explicit
// course mapping; activity program_id stamps are not trusted for scoping.
export async function loadMvpSignalEvidence(db: ReturnType<typeof createServiceClient>, courseSlug: string,
  learnerIds: string[], policy: MvpSignalPolicy | null, selfPaced: boolean) {
  const exams: MvpExamEvidence[] = [];
  const videos: MvpVideoEvidence[] = [];
  const ids = [...new Set(learnerIds)];
  for (const kind of ["exam", "video"] as const) {
    if (kind === "exam" ? !policy?.assessment : !policy?.progress || !selfPaced) continue;
    for (let offset = 0; offset < ids.length; offset += 100) {
      let cursor: string | null = null;
      while (true) {
        let query = kind === "exam"
          ? db.from("exam_attempts").select("id,student_id,exam_id,submitted_at,score,total")
            .eq("exam_id", policy!.assessment!.examId).in("student_id", ids.slice(offset, offset + 100))
          : db.from("week_progress").select("id,user_id,track_slug,week_number,video_watched_at")
            .eq("track_slug", courseSlug).in("user_id", ids.slice(offset, offset + 100));
        query = query.order("id").limit(500);
        if (cursor !== null) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to load complete check-in signal evidence.");
        if (!data.length) break;
        const next: string = data[data.length - 1].id;
        if (!next || (cursor !== null && next <= cursor)) throw new Error("Check-in signal pagination did not advance.");
        if (kind === "exam") exams.push(...data as unknown as MvpExamEvidence[]);
        else videos.push(...data as unknown as MvpVideoEvidence[]);
        cursor = next;
      }
    }
  }
  return { exams, videos };
}
