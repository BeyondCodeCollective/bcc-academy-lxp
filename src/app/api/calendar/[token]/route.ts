import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getHomeProgramForTrack, getTrackBySlug } from "@/lib/programs";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { unitDisplayMap, unitText } from "@/lib/programs/unit-display";
import {
  buildCalendar,
  icalTimestamp,
  addDays,
  type CalendarEvent,
} from "@/lib/ical";

export const dynamic = "force-dynamic";

/**
 * Per-student iCal feed. Calendar apps fetch this WITHOUT a session cookie, so
 * identity comes from the opaque `calendar_token` in the URL (generated on the
 * settings page). URL shape: /api/calendar/<token>.ics (the .ics suffix is
 * optional — calendar clients like a real file extension).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const now = new Date();
  const empty = () =>
    new NextResponse(buildCalendar("BCC Academy", [], icalTimestamp(now)), {
      headers: { "content-type": "text/calendar; charset=utf-8" },
    });

  if (!isSupabaseConfigured()) return empty();

  const { token } = await params;
  const cleanToken = token.replace(/\.ics$/i, "");
  // calendar_token is a uuid column — a malformed token can't match a row.
  if (!/^[0-9a-f-]{36}$/i.test(cleanToken)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("id")
    .eq("calendar_token", cleanToken)
    .maybeSingle<{ id: string }>();

  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: enrollments } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", student.id);

  const trackSlugs = [...new Set((enrollments ?? []).map((e) => e.track_slug as string))];

  const events: CalendarEvent[] = [];
  for (const slug of trackSlugs) {
    const home = getHomeProgramForTrack(slug);
    if (!home) continue; // builder-only courses aren't on a calendar yet
    const program = await getProgramWithOverrides(home.slug);
    const track = getTrackBySlug(program, slug);
    if (!track) continue;

    // Schedule — one all-day marker per unit, on its explicit `date` when the
    // syllabus carries one (a Tue/Thu session track, a break week), else the
    // 7-day fallback. Skip TBD start dates so we don't emit far-future
    // placeholder events.
    if (!track.startDateTbd && track.startDate) {
      const scheduleNote = [
        track.sessionTimes.length ? track.sessionTimes.join(" · ") : null,
        track.instructor ? `With ${track.instructor}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const display = unitDisplayMap(track.weekSummaries, track.unitLabel ?? "Week");
      for (const ws of track.weekSummaries) {
        events.push({
          // uid stays `-week-` even for Session tracks: it keys the event in
          // calendars people already subscribe to, so changing it would
          // duplicate every event rather than move it.
          uid: `${slug}-week-${ws.week}`,
          date: ws.date ?? addDays(track.startDate, (ws.week - 1) * 7),
          summary: `${track.shortName} · ${unitText(display, ws.week, track.unitLabel ?? "Week")}: ${ws.topic}`,
          description: scheduleNote || undefined,
        });
      }
    }

    // Office hours — explicit dates, the most reliable thing on the calendar.
    for (const oh of track.officeHours ?? []) {
      const desc = [oh.description, oh.dialIn ? `Dial-in: ${oh.dialIn}` : null]
        .filter(Boolean)
        .join("\n");
      events.push({
        uid: `${slug}-oh-${oh.date}-${oh.title.replace(/\s+/g, "-").toLowerCase()}`,
        date: oh.date,
        summary: `${oh.title}${oh.time ? ` · ${oh.time}` : ""}`,
        description: desc || undefined,
        url: oh.joinUrl,
      });
    }
  }

  const body = buildCalendar("BCC Academy — My Schedule", events, icalTimestamp(now));
  return new NextResponse(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=900",
    },
  });
}
