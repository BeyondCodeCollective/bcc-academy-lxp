// Keep each IN list bounded and each batch inside a single authorized program.
// Combining independent program/course IN lists would admit unintended pairs.
export function learnerCourseBatches<T extends { programId: string; slug: string }>(courses: T[]): T[][] {
  const programs = new Map<string, Map<string, T>>();
  for (const course of courses) {
    const group = programs.get(course.programId) ?? new Map<string, T>();
    group.set(course.slug, course);
    programs.set(course.programId, group);
  }
  const batches: T[][] = [];
  for (const group of programs.values()) {
    const rows = [...group.values()];
    for (let offset = 0; offset < rows.length; offset += 100) batches.push(rows.slice(offset, offset + 100));
  }
  return batches;
}
