// Pure date helper, kept free of server imports so the proxy can use it.

type CourseWindow = { start_date: string | null; total_weeks: number | null };

/** True until the course is past its last week (upcoming counts). */
export function courseNotOver(t: CourseWindow, now: Date = new Date()): boolean {
  if (!t.start_date) return false;
  if (!t.total_weeks) return true;
  const end = new Date(`${t.start_date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + t.total_weeks * 7);
  return now < end;
}
