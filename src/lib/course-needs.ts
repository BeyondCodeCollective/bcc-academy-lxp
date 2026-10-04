import { createServiceClient } from "@/lib/supabase/server";
import { meetingAutoRecording, meetingIdFromLink } from "@/lib/zoom-recordings";

export type CourseNeed = {
  label: string;
  detail: string;
};

export type NextSession = {
  title: string;
  /** "Wed, Oct 14 · 2:00 PM ET" */
  when: string;
  /** "today" | "tomorrow" | "in 12 days" */
  away: string;
  hasZoom: boolean;
  /** Cloud auto-record setting on the Zoom meeting; null when unknown. */
  autoRecord: "cloud" | "local" | "none" | "not_found" | null;
};

/** What the course page's right column shows: the problems, and what's next. */
export type CourseSidebar = { needs: CourseNeed[]; next: NextSession | null };

const ZOOM_LOOKUP_MS = 2500;

/** How far back a missing recording is still worth flagging. Older than this and
 *  Zoom's cloud copy may be gone, so the prompt would be noise. */
const RECORDING_LOOKBACK_DAYS = 14;

/**
 * What a running course needs from an admin right now. Returns problems only;
 * an empty list means the panel doesn't render.
 *
 * Every row is something that was found by hand this month: Network+ units 25-26
 * saved with no date so learners never saw them, and Catalyst Labs ran with no
 * recording and nobody knew until the next day. The launch-readiness panel
 * covers the weeks before a start date; this one covers a course once it's
 * underway.
 */
export async function getCourseSidebar(trackSlug: string): Promise<CourseSidebar> {
  const empty: CourseSidebar = { needs: [], next: null };
  const svc = createServiceClient();

  const { data: course } = await svc
    .from("track_overrides")
    .select("program_id, total_weeks, unit_label, week_summaries, archived_at")
    .eq("track_slug", trackSlug)
    .maybeSingle<{
      program_id: string;
      total_weeks: number | null;
      unit_label: string | null;
      week_summaries: { week: number; date?: string; time?: string; topic?: string }[] | null;
      archived_at: string | null;
    }>();
  if (!course || course.archived_at) return empty;

  const [{ data: sessions }, { data: attendance }] = await Promise.all([
    svc
      .from("session_content")
      .select("week_number, meeting_link, recording_url")
      .eq("program_id", course.program_id)
      .eq("track", trackSlug),
    svc.from("attendance").select("week_number").eq("track", trackSlug),
  ]);

  const unit = (course.unit_label ?? "Week").toLowerCase();
  const dateByUnit = new Map<number, string>(
    (course.week_summaries ?? []).flatMap((w) => (w.date ? [[w.week, w.date] as [number, string]] : [])),
  );
  const rowByUnit = new Map((sessions ?? []).map((s) => [s.week_number as number, s]));
  const ranUnits = new Set((attendance ?? []).map((a) => a.week_number as number));

  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const addDays = (iso: string, n: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const weekOut = addDays(todayET, 7);
  const lookback = addDays(todayET, -RECORDING_LOOKBACK_DAYS);
  const nums = (units: number[]) => units.map((n) => `#${n}`).join(", ");
  const needs: CourseNeed[] = [];

  // Units the course counts but the schedule has no date for. Dates live only in
  // week_summaries, and a unit without one never shows up for learners.
  const total = course.total_weeks ?? 0;
  const undated = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !dateByUnit.has(n));
  if (dateByUnit.size > 0 && undated.length > 0) {
    needs.push({
      label: `${undated.length} ${unit}${undated.length === 1 ? "" : "s"} with no date`,
      detail: `${nums(undated)} count toward the course but aren't on the schedule, so learners don't see them. Set their dates in Curriculum.`,
    });
  }

  // Dated unit within a week but no Zoom link: learners hit a join page with
  // nowhere to go, and the recording import can't match the class to the unit.
  const soon = [...dateByUnit.entries()].filter(([, d]) => d >= todayET && d <= weekOut).map(([n]) => n);
  const noLink = soon.filter((n) => !((rowByUnit.get(n)?.meeting_link as string | null) ?? "").trim());
  if (noLink.length > 0) {
    needs.push({
      label: `Next 7 days: ${noLink.length} ${unit}${noLink.length === 1 ? "" : "s"} with no Zoom link`,
      detail: `${nums(noLink)} — add the meeting link in Curriculum so Join works and the recording can be matched.`,
    });
  }

  // A class that ran (someone checked in) with a Zoom link and no recording.
  // Strictly before today: the hourly import needs time after class ends.
  const missingRecording = [...dateByUnit.entries()]
    .filter(([n, d]) => {
      const row = rowByUnit.get(n);
      return (
        d < todayET &&
        d >= lookback &&
        ranUnits.has(n) &&
        ((row?.meeting_link as string | null) ?? "").trim() &&
        !((row?.recording_url as string | null) ?? "").trim()
      );
    })
    .map(([n]) => n);
  if (missingRecording.length > 0) {
    needs.push({
      label: `${missingRecording.length} ${unit}${missingRecording.length === 1 ? "" : "s"} held with no recording`,
      detail: `${nums(missingRecording)} — check Zoom cloud recordings; if there's none, ask the host for a local copy and attach it in Curriculum.`,
    });
  }

  // The next dated unit, and whether its Zoom meeting will actually record.
  // Catalyst Labs ran with no recording; this is the day-before warning.
  const upcoming = (course.week_summaries ?? [])
    .filter((w) => w.date && w.date >= todayET)
    .sort((a, b) => a.date!.localeCompare(b.date!))[0];
  let next: NextSession | null = null;
  if (upcoming?.date) {
    const link = ((rowByUnit.get(upcoming.week)?.meeting_link as string | null) ?? "").trim();
    const meetingId = meetingIdFromLink(link);
    let autoRecord: NextSession["autoRecord"] = null;
    if (meetingId) {
      const setting = await Promise.race([
        meetingAutoRecording(meetingId),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ZOOM_LOOKUP_MS)),
      ]).catch(() => null);
      autoRecord = setting === "no_scope" ? null : setting;
    }
    if (autoRecord && autoRecord !== "cloud") {
      needs.push({
        label: "Next session won't cloud-record",
        detail:
          autoRecord === "not_found"
            ? "Its Zoom meeting isn't in our connected Zoom account, so any recording lands elsewhere. Move it or schedule it under our account."
            : "Zoom auto-record isn't set to Cloud on this meeting. Change it in Zoom before class; a missed recording can't be recovered.",
      });
    }
    const days = Math.round(
      (new Date(`${upcoming.date}T12:00:00Z`).getTime() - new Date(`${todayET}T12:00:00Z`).getTime()) / 86_400_000,
    );
    const day = new Date(`${upcoming.date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const clock = upcoming.time
      ? new Date(`2000-01-01T${upcoming.time}:00Z`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " ET"
      : null;
    next = {
      title: upcoming.topic?.trim() || `${course.unit_label ?? "Week"} ${upcoming.week}`,
      when: clock ? `${day} · ${clock}` : day,
      away: days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`,
      hasZoom: Boolean(link),
      autoRecord,
    };
  }

  return { needs, next };
}
