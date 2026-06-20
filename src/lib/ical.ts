/**
 * Minimal RFC-5545 iCalendar builder. Pure functions only — no I/O — so the
 * formatting (escaping, line folding, CRLF) is easy to get right and test.
 *
 * Everything is modelled as an all-day event keyed by date (YYYY-MM-DD). The
 * platform stores session times as freeform text ("Tuesday 10–11am ET"), which
 * can't be parsed into reliable wall-clock times, so we surface that text in
 * the event title/description instead of guessing a DTSTART time.
 */

export type CalendarEvent = {
  /** Stable unique id (local part); "@bccacademy.io" is appended. */
  uid: string;
  /** All-day date, ISO YYYY-MM-DD. */
  date: string;
  summary: string;
  description?: string;
  url?: string;
};

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
    lines.push(`DTSTART;VALUE=DATE:${toDateValue(ev.date)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    if (ev.url) lines.push(foldLine(`URL:${escapeText(ev.url)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Current time as a UTC iCal timestamp, e.g. 20260620T142200Z. */
export function icalTimestamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
