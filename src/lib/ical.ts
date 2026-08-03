/**
 * Minimal RFC-5545 iCalendar builder. Pure functions only — no I/O — so the
 * formatting (escaping, line folding, CRLF) is easy to get right and test.
 *
 * An event is all-day unless it carries a `startTime`. Session times used to be
 * freeform text ("Tuesday 10–11am ET") that couldn't be parsed, so everything
 * was an all-day marker; syllabi now carry a structured `time` per unit, so a
 * session can land at the hour it actually meets.
 */

export type CalendarEvent = {
  /** Stable unique id (local part); "@bccacademy.io" is appended. */
  uid: string;
  /** ISO YYYY-MM-DD. All-day unless `startTime` is set. */
  date: string;
  /** Wall-clock start in `timeZone`, 24-hour "HH:MM". Makes the event timed. */
  startTime?: string;
  /** Length in minutes. Required alongside startTime; defaults to 60. */
  durationMinutes?: number;
  /** IANA zone the wall-clock time is expressed in. */
  timeZone?: string;
  summary: string;
  description?: string;
  url?: string;
  /** Shown as the event's "where" — calendar UIs surface this far more
   *  prominently than URL, so program links belong here too. */
  location?: string;
};

/** The zone's offset from UTC, in ms, at a given instant. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asIfUtc - at.getTime();
}

/**
 * A wall-clock date+time in `timeZone` → the UTC instant it names.
 *
 * Two passes: the first guess treats the wall clock as UTC, then subtracts the
 * zone's offset AT THAT GUESS; the second pass re-measures the offset at the
 * corrected instant, which settles any DST boundary the guess straddled.
 * Emitting UTC (`...Z`) means no VTIMEZONE block is needed and no client has to
 * agree with us about when DST starts.
 */
export function zonedTimeToUtc(
  isoDate: string,
  hhmm: string,
  timeZone: string,
): Date {
  const [y, mo, d] = isoDate.slice(0, 10).split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let instant = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    instant = wallAsUtc - zoneOffsetMs(new Date(instant), timeZone);
  }
  return new Date(instant);
}

/** A Date → "20260715T223000Z". */
function toUtcStamp(at: Date): string {
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape TEXT values per RFC 5545 §3.3.11 (backslash, ; , and newlines). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold content lines to ≤75 octets, continuation lines start with a space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

/** "2026-06-02" → "20260602" (VALUE=DATE form). */
function toDateValue(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

/** Add `days` to an ISO date (UTC math), returns YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a complete VCALENDAR document. `dtstamp` is the generation time as a
 * UTC iCal timestamp (YYYYMMDDTHHMMSSZ) — pass it in so callers control "now".
 */
export function buildCalendar(
  calendarName: string,
  events: CalendarEvent[],
  dtstamp: string,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BCC Academy//Learning Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calendarName)}`),
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${ev.uid}@bccacademy.io`));
    lines.push(`DTSTAMP:${dtstamp}`);
    if (ev.startTime && ev.timeZone) {
      const start = zonedTimeToUtc(ev.date, ev.startTime, ev.timeZone);
      const end = new Date(start.getTime() + (ev.durationMinutes ?? 60) * 60_000);
      lines.push(`DTSTART:${toUtcStamp(start)}`);
      lines.push(`DTEND:${toUtcStamp(end)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toDateValue(ev.date)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    if (ev.url) lines.push(foldLine(`URL:${escapeText(ev.url)}`));
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Current time as a UTC iCal timestamp, e.g. 20260620T142200Z. */
export function icalTimestamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
