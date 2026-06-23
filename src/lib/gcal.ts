/**
 * Build a Google Calendar "add event" link (the calendar.google.com/render
 * template URL). No OAuth, no API, no backend — one click drops the event into
 * the student's own Google Calendar.
 *
 * Office-hour times are freeform text ("4pm EST (1pm PT)"), which can't be
 * parsed into a reliable wall-clock time, so — like the iCal feed — we emit an
 * all-day event on the date and carry the time + dial-in in the details.
 */
export function buildGoogleCalendarUrl(opts: {
  title: string;
  /** ISO date, YYYY-MM-DD. Used when no precise time is known (all-day). */
  date: string;
  /** ISO 8601 UTC start, e.g. "2026-07-09T18:00:00Z". When provided (with
   *  endUtc), emits a timed event instead of an all-day one. */
  startUtc?: string | null;
  endUtc?: string | null;
  details?: string;
  location?: string;
}): string {
  let dates: string;
  if (opts.startUtc && opts.endUtc) {
    dates = `${toGcalUtc(opts.startUtc)}/${toGcalUtc(opts.endUtc)}`;
  } else {
    const start = opts.date.replace(/-/g, "");
    // All-day events use an exclusive end date, so the marker is the next day.
    dates = `${start}/${addOneDay(start)}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** ISO 8601 → Google/iCal UTC basic format: "2026-07-09T18:00:00Z" → "20260709T180000Z". */
export function toGcalUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** "20260709" → "20260710" (UTC date math). */
function addOneDay(yyyymmdd: string): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}
