import { NextRequest, NextResponse } from "next/server";
import { toGcalUtc } from "@/lib/gcal";

// Serves a downloadable .ics for the "Add to iCal / Apple Calendar" link in
// registration emails. All inputs come from the query string so the link can be
// built statically inside an email (no auth, no DB) — it only describes an event,
// it grants nothing.
//
//   /api/calendar/event?title=...&start=<iso>&end=<iso>&location=...&details=...&uid=...

export const dynamic = "force-dynamic";

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const title = q.get("title") ?? "Event";
  const start = q.get("start");
  const end = q.get("end");
  const location = q.get("location") ?? "";
  const details = q.get("details") ?? "";
  const uid = q.get("uid") ?? `${Date.parse(start ?? "") || "event"}@bccacademy.io`;

  if (!start) {
    return NextResponse.json({ error: "Missing start" }, { status: 400 });
  }

  const dtStart = toGcalUtc(start);
  // Default to a 1-hour block when no end is supplied.
  const dtEnd = toGcalUtc(end ?? new Date(Date.parse(start) + 3_600_000).toISOString());
  const dtStamp = toGcalUtc(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BCC Academy//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(title)}`,
    location ? `LOCATION:${escapeIcs(location)}` : "",
    details ? `DESCRIPTION:${escapeIcs(details)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
    },
  });
}
