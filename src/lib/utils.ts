/**
 * Compute the current week number (1-based) from a cohort start date.
 * Returns a value clamped between 1 and totalWeeks.
 *
 * @param lastSessionDayOffset — number of days after the week's start day when
 *   the last session of that week occurs. Once that day has passed, we advance
 *   to the next week. For example, Tech+ starts Wednesday and the last session
 *   is Friday → offset = 2. MASS starts Tuesday with one session on the start
 *   day → offset = 6 (default, preserves original 7-day-cycle behavior).
 */
export function computeCurrentWeek(
  startDate: string,
  totalWeeks: number = 8,
  lastSessionDayOffset: number = 6
): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= lastSessionDayOffset) return Math.max(1, Math.min(1, totalWeeks));
  const week = Math.floor((diffDays - lastSessionDayOffset - 1) / 7) + 2;
  return Math.max(1, Math.min(week, totalWeeks));
}

/**
 * Format a date string to a readable format like "Mar 21, 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a time string (HH:MM:SS) to 12-hour format like "6:00 PM"
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<string, string> = {
  course_materials: "Course Materials",
  recordings: "Recordings",
  career_prep: "Career Prep",
  program_info: "Program Info",
};
