// Sentinel check: does yesterday's attendance agree with Zoom?
//
// The zoom-attendance cron (04:00 UTC) writes attendance from Zoom's report;
// the Sentinel (07:00 UTC) re-reads Zoom for the same classes and lists every
// disagreement, so a missed restart, a renamed joiner or a hand-marked
// no-show gets a human's eyes the next morning instead of at grading time.
//
// Read-only.

import type { createServiceClient } from "@/lib/supabase/server";
import { parseZoomLink } from "@/lib/zoom";
import { getMeetingHostEmail, getParticipantsOnDay, zoomReportConfigured } from "@/lib/zoom-report";
import {
  matchParticipants,
  normName,
  type EnrolledStudent,
} from "@/lib/attendance/zoom-sync";
import type { SentinelRow } from "./checks";

type Svc = ReturnType<typeof createServiceClient>;
type Unit = { week: number; date?: string };
type Person = EnrolledStudent & { is_test: boolean | null };

const LIMIT = 10000;

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

const fullName = (s: { first_name: string | null; last_name: string | null }) =>
  `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();

/**
 * Pure comparison for one class: who Zoom saw vs who has an attendance row.
 * `staffNames` / `staffEmails` are instructors and the meeting host; they are
 * never reported as unmatched.
 */
export function diffClass(input: {
  label: string;
  keyPrefix: string;
  participants: Parameters<typeof matchParticipants>[0];
  roster: EnrolledStudent[];
  attendedIds: Set<string>;
  staffNames: Set<string>;
  staffEmails: Set<string>;
}): SentinelRow[] {
  const { label, keyPrefix, participants, roster, attendedIds, staffNames, staffEmails } = input;
  const nameOf = new Map(roster.map((s) => [s.id, fullName(s) || s.email || s.id]));
  const { matchedIds, unmatched } = matchParticipants(participants, roster);
  const out: SentinelRow[] = [];

  for (const id of matchedIds) {
    if (attendedIds.has(id)) continue;
    out.push({ label: `${label}: ${nameOf.get(id)} was in Zoom but has no attendance`, key: `${keyPrefix}|zoom-only|${id}` });
  }
  for (const p of unmatched) {
    if (staffNames.has(normName(p.name)) || (p.email && staffEmails.has(p.email))) continue;
    out.push({
      label: `${label}: Zoom name "${p.name}" matches no enrolled learner`,
      key: `${keyPrefix}|unknown|${normName(p.name) || p.email}`,
    });
  }
  for (const id of attendedIds) {
    if (matchedIds.has(id) || !nameOf.has(id)) continue;
    out.push({ label: `${label}: ${nameOf.get(id)} is marked present but not in Zoom`, key: `${keyPrefix}|recorded-only|${id}` });
  }
  return out;
}

/** Mismatch rows for every class that met on `dayKey` (ET). Classes with no
 *  Zoom link or no Zoom data yet are skipped, not reported: no data is not a
 *  disagreement. */
export async function zoomAttendanceMismatches(svc: Svc, dayKey: string): Promise<SentinelRow[]> {
  if (!zoomReportConfigured()) return [];

  const courses = await rows<{
    track_slug: string;
    program_id: string | null;
    name: string | null;
    week_summaries: Unit[] | null;
  }>(svc.from("track_overrides").select("track_slug, program_id, name, week_summaries").limit(LIMIT));

  const out: SentinelRow[] = [];
  for (const c of courses) {
    if (!c.program_id) continue;
    for (const u of (c.week_summaries ?? []).filter((w) => w.date === dayKey)) {
      const content = await rows<{ meeting_link: string | null }>(
        svc
          .from("session_content")
          .select("meeting_link")
          .eq("program_id", c.program_id)
          .eq("track", c.track_slug)
          .eq("week_number", u.week)
          .limit(1),
      );
      const parsed = content[0]?.meeting_link ? parseZoomLink(content[0].meeting_link) : null;
      if (!parsed) continue;

      const participants = await getParticipantsOnDay(parsed.meetingNumber, dayKey);
      if (participants.length === 0) continue;

      const [hostEmail, enrolled, instructors, attendance] = await Promise.all([
        getMeetingHostEmail(parsed.meetingNumber),
        rows<{ student_id: string }>(
          svc.from("student_tracks").select("student_id").eq("track_slug", c.track_slug).eq("program_id", c.program_id).limit(LIMIT),
        ),
        rows<{ student_id: string }>(
          svc.from("instructor_tracks").select("student_id").eq("track_slug", c.track_slug).eq("program_id", c.program_id).limit(LIMIT),
        ),
        rows<{ student_id: string }>(
          svc
            .from("attendance")
            .select("student_id")
            .eq("program_id", c.program_id)
            .eq("track", c.track_slug)
            .eq("week_number", u.week)
            .eq("session_number", 1)
            .limit(LIMIT),
        ),
      ]);
      const instructorIds = new Set(instructors.map((r) => r.student_id));
      const people = await rows<Person>(
        svc
          .from("students")
          .select("id, email, first_name, last_name, is_test")
          .in("id", [...new Set([...enrolled.map((r) => r.student_id), ...instructorIds])])
          .limit(LIMIT),
      );
      const roster = people.filter((p) => !p.is_test && !instructorIds.has(p.id));
      const staff = people.filter((p) => instructorIds.has(p.id));

      out.push(
        ...diffClass({
          label: `${c.name ?? c.track_slug} week ${u.week} (${dayKey})`,
          keyPrefix: `${c.program_id}|${c.track_slug}|${u.week}|${dayKey}`,
          participants,
          roster,
          attendedIds: new Set(attendance.map((r) => r.student_id)),
          staffNames: new Set(staff.map((s) => normName(fullName(s))).filter(Boolean)),
          staffEmails: new Set(
            [hostEmail, ...staff.map((s) => s.email?.toLowerCase())].filter((e): e is string => !!e),
          ),
        }),
      );
    }
  }
  return out;
}
