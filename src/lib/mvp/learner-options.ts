import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { getEveryProgramConfig } from "@/lib/programs";
import type { LearnerProgramScope } from "./learner-queries";
import { learnerCourseBatches } from "./learner-batches";

// Internal helper: scope must come from getMvpLearnersData, never request input.
export async function loadLearnerOptions(db: ReturnType<typeof createServiceClient>, scope: LearnerProgramScope[]) {
  const options = {
    programs: scope.map(({ id, name }) => ({ id, name })),
    courses: [] as { programId: string; slug: string; name: string }[],
    cohorts: [] as { programId: string; courseSlug: string; id: string; name: string }[],
  };
  const configs = getEveryProgramConfig();
  for (const program of scope) {
    const courses = new Map<string, string>();
    const permitted = (slug: string) => program.courseSlugs === null || program.courseSlugs.includes(slug);
    for (const track of configs.find(config => config.slug === program.slug)?.tracks ?? []) {
      if (permitted(track.slug)) courses.set(track.slug, track.name);
    }
    let cursor: string | null = null;
    while (true) {
      let query = db.from("track_overrides").select("id, track_slug, name").eq("program_id", program.id).order("id").limit(500);
      if (program.courseSlugs !== null) {
        if (!program.courseSlugs.length) break;
        query = query.in("track_slug", program.courseSlugs);
      }
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) throw new Error("Unable to load learner course options.");
      if (!data.length) break;
      for (const row of data) {
        if (typeof row.track_slug !== "string" || !row.track_slug || !permitted(row.track_slug) || (row.name !== null && typeof row.name !== "string")) throw new Error("Invalid learner course options.");
        courses.set(row.track_slug, row.name?.trim() || courses.get(row.track_slug) || row.track_slug);
      }
      const next: string = data[data.length - 1].id;
      if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Course pagination did not advance.");
      cursor = next;
    }
    for (const [slug, name] of courses) {
      // Existing application convention: hiding applies globally by track slug.
      const hidden = await db.from("hidden_courses").select("track_slug").eq("track_slug", slug).limit(1);
      if (hidden.error || !Array.isArray(hidden.data)) throw new Error("Unable to verify hidden courses.");
      if (hidden.data.length) continue;
      options.courses.push({ programId: program.id, slug, name });
    }
    for (const batch of learnerCourseBatches(options.courses.filter(course => course.programId === program.id))) {
      const slugs = batch.map(course => course.slug);
      cursor = null;
      while (true) {
        let query = db.from("cohorts").select("id, name, display_name, program_id, track_slug").eq("program_id", program.id).in("track_slug", slugs).order("id").limit(500);
        if (cursor) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to load learner cohort options.");
        if (!data.length) break;
        for (const row of data) {
          if (typeof row.id !== "string" || !row.id || typeof row.name !== "string" || row.program_id !== program.id || !slugs.includes(row.track_slug) || (row.display_name !== null && typeof row.display_name !== "string")) throw new Error("Invalid learner cohort options.");
          options.cohorts.push({ programId: program.id, courseSlug: row.track_slug, id: row.id, name: row.display_name?.trim() || row.name });
        }
        const next: string = data[data.length - 1].id;
        if (!next || (cursor !== null && next <= cursor)) throw new Error("Cohort pagination did not advance.");
        cursor = next;
      }
    }
  }
  options.programs.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  options.courses.sort((a, b) => a.name.localeCompare(b.name) || a.programId.localeCompare(b.programId) || a.slug.localeCompare(b.slug));
  options.cohorts.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return options;
}
