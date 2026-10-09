// Dates select overlapping offerings, not activity timestamps. Unknown dates
// never silently qualify; callers must disclose exclusions to administrators.
export function parseMvpDateWindow(start: string | null, end: string | null) {
  for (const value of [start, end]) {
    if (value === null) continue;
    const date = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) throw new Error("Choose valid reporting dates.");
  }
  if (start && end && start > end) throw new Error("Start date must not follow end date.");
  return { start, end };
}

export function matchesMvpDateWindow(
  offering: { startDate: string | null; endDate: string | null },
  window: ReturnType<typeof parseMvpDateWindow>,
): boolean | null {
  if (!window.start && !window.end) return true;
  if (window.end && offering.startDate && offering.startDate > window.end) return false;
  if (window.start && offering.endDate && offering.endDate < window.start) return false;
  if ((window.end && !offering.startDate) || (window.start && !offering.endDate)) return null;
  return true;
}
