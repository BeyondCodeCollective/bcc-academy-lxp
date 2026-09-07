// Which of a program's courses a person sees on their dashboard home.
//
// Extracted from dashboard/page.tsx so the rule is testable on its own: the
// bug this fixes was an instructor seeing every course in the program (with
// roster counts) because instructors hold access_admin_panel and fell into
// the admin branch, ignoring instructor_tracks entirely.

export type VisibilityInput = {
  /** Every course slug in the resolved program. */
  programSlugs: string[];
  /** Slugs the person is enrolled in, companions already collapsed. */
  enrolledSlugs: string[];
  /** instructor_tracks slugs, or null when the person is not an instructor. */
  assignedSlugs: string[] | null;
  /** Admin-panel access AND not previewing as a student. */
  isAdmin: boolean;
  /** True for admin/super_admin — the roles that legitimately see a whole
   *  program. Instructors have admin-panel access but not this. */
  seesWholeProgram: boolean;
};

/** The slugs to render, in the program's own order. */
export function visibleCourseSlugs(input: VisibilityInput): string[] {
  const { programSlugs, enrolledSlugs, assignedSlugs, isAdmin, seesWholeProgram } = input;

  // An instructor sees what they teach, plus anything they're enrolled in as
  // a learner — never the whole program.
  if (assignedSlugs !== null && !seesWholeProgram) {
    const allowed = new Set([...assignedSlugs, ...enrolledSlugs]);
    return programSlugs.filter((s) => allowed.has(s));
  }
  if (isAdmin) return programSlugs;
  const enrolled = new Set(enrolledSlugs);
  return programSlugs.filter((s) => enrolled.has(s));
}
