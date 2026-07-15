// Reconcile a live session's real Zoom attendance into our `attendance` table.
//
// The embedded player (/api/zoom-signature) only sees learners who join through
// the site. This pulls Zoom's own participant report — every joiner, any client
// — and upserts it, so app/phone/direct-link joiners stop being invisible.
// Idempotent: upserts against the 5-column unique key, so re-running a session
// (or overlapping with embed auto-attendance) never double-counts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseZoomLink } from "@/lib/zoom";
import {
  getPastMeetingParticipants,
  zoomReportConfigured,
  type ZoomParticipant,
} from "@/lib/zoom-report";

type EnrolledStudent = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type ZoomSyncResult = {
  ok: boolean;
  reason?: string;
  matched: number;
  marked: number;
  unmatched: { name: string; email: string | null }[];
};

// Normalize a display name for fallback matching: lowercase, strip anything in
// parens ("Ada Lovelace (she/her)"), collapse whitespace. Not exact science —
// email is the primary key; this only rescues participants who joined without a
// Zoom email.
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function syncZoomAttendanceForSession(
  svc: SupabaseClient,
  params: {
    programId: string;
    trackSlug: string;
    weekNumber: number;
    sessionNumber?: number;
  },
): Promise<ZoomSyncResult> {
  const { programId, trackSlug, weekNumber } = params;
  const sessionNumber = params.sessionNumber ?? 1;
  const empty = { matched: 0, marked: 0, unmatched: [] as ZoomSyncResult["unmatched"] };

  if (!zoomReportConfigured()) {
    return { ok: false, reason: "zoom-not-configured", ...empty };
  }

  // Which meeting? session_content holds the per-(track, week) link; session 2
  // uses the _2 column.
  const { data: content } = await svc
    .from("session_content")
    .select("meeting_link, meeting_link_2")
    .eq("track", trackSlug)
    .eq("week_number", weekNumber)
    .maybeSingle<{ meeting_link: string | null; meeting_link_2: string | null }>();
  const link = sessionNumber === 2 ? content?.meeting_link_2 : content?.meeting_link;
  const parsed = link ? parseZoomLink(link) : null;
  if (!parsed) {
    return { ok: false, reason: "no-zoom-meeting-link", ...empty };
  }

  let participants: ZoomParticipant[];
  try {
    participants = await getPastMeetingParticipants(parsed.meetingNumber);
  } catch (e) {
    return { ok: false, reason: `zoom-report-error: ${(e as Error).message}`, ...empty };
  }
  if (participants.length === 0) {
    return { ok: true, reason: "no-participants-yet", ...empty };
  }

  // Enrolled roster (real learners; is_test excluded so QA logins never mark).
  const { data: enrollRows } = await svc
    .from("student_tracks")
    .select("student_id")
    .eq("track_slug", trackSlug);
  const ids = (enrollRows ?? []).map((r) => (r as { student_id: string }).student_id);
  if (ids.length === 0) return { ok: true, reason: "no-enrollment", ...empty };

  const { data: studentRows } = await svc
    .from("students")
    .select("id, email, first_name, last_name")
    .in("id", ids)
    .eq("is_test", false);
  const students = (studentRows ?? []) as EnrolledStudent[];

  const byEmail = new Map<string, EnrolledStudent>();
  const byName = new Map<string, EnrolledStudent>();
  for (const s of students) {
    if (s.email) byEmail.set(s.email.toLowerCase(), s);
    const full = normName(`${s.first_name ?? ""} ${s.last_name ?? ""}`);
    if (full) byName.set(full, s);
  }

  const matchedIds = new Set<string>();
  const unmatched: ZoomSyncResult["unmatched"] = [];
  for (const p of participants) {
    const hit =
      (p.email && byEmail.get(p.email)) || byName.get(normName(p.name)) || null;
    if (hit) matchedIds.add(hit.id);
    else unmatched.push({ name: p.name, email: p.email });
  }

  if (matchedIds.size === 0) {
    return { ok: true, reason: "no-matches", matched: 0, marked: 0, unmatched };
  }

  const rows = Array.from(matchedIds).map((student_id) => ({
    program_id: programId,
    student_id,
    track: trackSlug,
    week_number: weekNumber,
    session_number: sessionNumber,
    marked_by: null as string | null, // system-marked from the Zoom report
  }));
  const { error } = await svc
    .from("attendance")
    .upsert(rows, {
      onConflict: "program_id,student_id,track,week_number,session_number",
      ignoreDuplicates: true,
    });
  if (error) {
    return { ok: false, reason: `upsert-error: ${error.message}`, matched: matchedIds.size, marked: 0, unmatched };
  }

  return { ok: true, matched: matchedIds.size, marked: rows.length, unmatched };
}
