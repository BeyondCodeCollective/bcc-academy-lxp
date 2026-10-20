import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";

// Cohort metadata is not a historical roster or a source of course metrics.
export type MvpLinkedCohort = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

// Call only after authorization and offering filters have resolved this exact
// program/course pair. Null or unrelated track links are never inferred.
export async function loadMvpLinkedCohorts(
  db: ReturnType<typeof createServiceClient>, programId: string, courseSlug: string,
): Promise<MvpLinkedCohort[]> {
  const cohorts: MvpLinkedCohort[] = [];
  let cursor: string | null = null;
  while (true) {
    let query = db.from("cohorts").select("id, name, display_name, start_date, end_date")
      .eq("program_id", programId).eq("track_slug", courseSlug).order("id", { ascending: true }).limit(500);
    if (cursor !== null) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error("Unable to load linked cohorts.");
    if (!data?.length) break;
    for (const cohort of data) cohorts.push({ id: cohort.id,
      name: cohort.display_name?.trim() || cohort.name,
      startDate: cohort.start_date, endDate: cohort.end_date });
    const next: string = data[data.length - 1].id;
    if (cursor !== null && next <= cursor) throw new Error("Cohort pagination did not advance.");
    cursor = next;
  }
  return cohorts;
}
