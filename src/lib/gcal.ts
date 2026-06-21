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
  /** ISO date, YYYY-MM-DD */
  date: string;
  details?: string;
  location?: string;
}): string {
  const start = opts.date.replace(/-/g, "");
  // All-day events use an exclusive end date, so the marker is the next day.
  const end = addOneDay(start);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${start}/${end}`,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** "20260709" → "20260710" (UTC date math). */
function addOneDay(yyyymmdd: string): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}
