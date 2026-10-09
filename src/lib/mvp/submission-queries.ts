import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { MvpSubmissionRecord } from "./required-work";

// Call only after authorization and roster scoping. Like other legacy
// activity, submissions are identified by course + eligible learner, not
// their potentially stale program_id. Cursor pagination must exhaust pages.
export async function loadMvpSubmissions(
  db: ReturnType<typeof createServiceClient>, courseSlug: string, learnerIds: string[],
): Promise<MvpSubmissionRecord[]> {
  const ids = [...new Set(learnerIds)];
  const records: MvpSubmissionRecord[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    let cursor: string | null = null;
    while (true) {
      let query = db.from("submissions")
        .select("id, student_id, track_slug, week_number, submitted_at")
        .eq("track_slug", courseSlug).in("student_id", ids.slice(offset, offset + 100))
        .order("id").limit(500);
      if (cursor !== null) query = query.gt("id", cursor);
      const { data, error } = await query.returns<MvpSubmissionRecord[]>();
      if (error || !Array.isArray(data)) throw new Error("Unable to load complete required submission records.");
      if (!data.length) break;
      records.push(...data);
      const next = data[data.length - 1].id;
      if (!next || (cursor !== null && next <= cursor)) throw new Error("Submission pagination did not advance.");
      cursor = next;
    }
  }
  return records;
}
