import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { loadLearnerOptions } from "./learner-options";

export type LearnerQueryParams = Partial<Record<"programId" | "courseSlug" | "cohortId" | "search" | "status" | "page" | "pageSize", string | string[]>>;
export function parseLearnerQuery(params: LearnerQueryParams) {
  const value = (key: keyof LearnerQueryParams) => {
    const raw = params[key];
    if (raw !== undefined && typeof raw !== "string") throw new Error("Choose one value per learner filter.");
    const result = raw?.trim() || "";
    if (result.length > 200) throw new Error("Learner filter is too long.");
    return result;
  };
  const filters = { programId: value("programId"), courseSlug: value("courseSlug"), cohortId: value("cohortId"), search: value("search"), status: value("status") || "all" };
  if (!["all", "not_evaluated", "on_track", "needs_check_in"].includes(filters.status)) throw new Error("Unsupported learner status.");
  if (["on_track", "needs_check_in"].includes(filters.status)) throw new Error("Learner status evaluation is not connected yet.");
  if (filters.courseSlug && !filters.programId) throw new Error("Choose a program before a course.");
  if (filters.cohortId && !filters.courseSlug) throw new Error("Choose a course before a cohort.");
  return filters;
}

type Enrollment = { programId: string; programName: string; courseSlug: string; courseName: string;
  cohort: { id: string; name: string } | null; attendance: null;
  lastActivity: { at: null; state: "unavailable" }; status: "not_evaluated" };
type Learner = { id: string; firstName: string | null; lastName: string | null; email: string | null; enrollments: Enrollment[] };
type Profile = { id: string; first_name: string | null; last_name: string | null; email: string | null; cohort_id: string | null; role: string; is_test: boolean | null; is_staff: boolean | null };

// Internal only. Options must be produced by the authorized loader. Search is
// literal and server-side after authorized reads, never interpolated into SQL
// or PostgREST expressions. No private activity contents or geography are read.
export async function loadLearnerRoster(db: ReturnType<typeof createServiceClient>, options: Awaited<ReturnType<typeof loadLearnerOptions>>, filters: ReturnType<typeof parseLearnerQuery>) {
  if (filters.courseSlug && !options.courses.some(c => c.programId === filters.programId && c.slug === filters.courseSlug)) throw new Error("The selected course is unavailable.");
  if (filters.cohortId && !options.cohorts.some(c => c.programId === filters.programId && c.courseSlug === filters.courseSlug && c.id === filters.cohortId)) throw new Error("The selected cohort is unavailable.");
  const learners = new Map<string, Learner>();
  const search = filters.search.toLocaleLowerCase("en-US");
  for (const course of options.courses.filter(c => (!filters.programId || c.programId === filters.programId) && (!filters.courseSlug || c.slug === filters.courseSlug))) {
    let cursor: string | null = null;
    while (true) {
      let query = db.from("student_tracks")
        .select("id, student_id, program_id, track_slug, students!inner(id, first_name, last_name, email, cohort_id, role, is_test, is_staff)")
        .eq("program_id", course.programId).eq("track_slug", course.slug).eq("students.role", "student")
        .or("is_test.is.null,is_test.eq.false", { referencedTable: "students" })
        .or("is_staff.is.null,is_staff.eq.false", { referencedTable: "students" })
        .order("id").limit(500);
      if (filters.cohortId) query = query.eq("students.cohort_id", filters.cohortId);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) throw new Error("Unable to load the complete learner directory.");
      if (!data.length) break;
      for (const row of data) {
        const embedded = row.students as unknown as Profile | Profile[] | null;
        const profile = Array.isArray(embedded) ? (embedded.length === 1 ? embedded[0] : null) : embedded;
        if (!profile || profile.id !== row.student_id || row.program_id !== course.programId || row.track_slug !== course.slug) throw new Error("Inconsistent learner enrollment records.");
        if (profile.role !== "student" || profile.is_test === true || profile.is_staff === true) continue;
        if (![profile.first_name, profile.last_name, profile.email, profile.cohort_id].every(v => v === null || typeof v === "string")) throw new Error("Invalid learner profile fields.");
        if (filters.cohortId && profile.cohort_id !== filters.cohortId) continue;
        if (search && ![[profile.first_name, profile.last_name].filter(Boolean).join(" "), profile.email || ""].some(v => v.toLocaleLowerCase("en-US").includes(search))) continue;
        const cohort = options.cohorts.find(c => c.id === profile.cohort_id && c.programId === course.programId && c.courseSlug === course.slug);
        const person: Learner = { id: profile.id, firstName: profile.first_name, lastName: profile.last_name, email: profile.email, enrollments: [] };
        const existing = learners.get(person.id);
        if (existing && (existing.firstName !== person.firstName || existing.lastName !== person.lastName || existing.email !== person.email)) throw new Error("Conflicting learner profile records.");
        const target = existing ?? person;
        if (!target.enrollments.some(e => e.programId === course.programId && e.courseSlug === course.slug)) target.enrollments.push({
          programId: course.programId, programName: options.programs.find(p => p.id === course.programId)!.name,
          courseSlug: course.slug, courseName: course.name, cohort: cohort ? { id: cohort.id, name: cohort.name } : null,
          attendance: null, lastActivity: { at: null, state: "unavailable" }, status: "not_evaluated",
        });
        learners.set(person.id, target);
      }
      const next: string = data[data.length - 1].id;
      if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner pagination did not advance.");
      cursor = next;
    }
  }
  return [...learners.values()].sort((a, b) => `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`, "en-US") || a.id.localeCompare(b.id));
}
