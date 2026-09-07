// Acquisition & Risk analytics — "are people getting in and starting, and who
// needs help now?"
//
// Two funnels (each monotonic within itself, so the bars never read backwards):
//   • Invite funnel:     Invited → Accepted          (from `invites`)
//   • Activation funnel: Signed up → Onboarded → Activated → Active (7d)
//                                                     (from `students` + activity)
//
// Risk is ONE model, chosen by track modality (docs/analytics-plan.md):
//   • live tracks      → attendance-rate, via the same summarizeStudent() the
//                        Attendance tab uses, gated by MIN_SESSIONS_FOR_RISK.
//   • on-demand / none → recency of last signal (nothing scheduled to miss).
//
// Previously this was recency-only while the Attendance tab was rate-only, so
// the SAME learner could read "On track" here and "Low attendance" there — a
// learner who logs in daily but skips every live session being the classic case.
// The old objection to rate-scoring (it "mis-penalizes anyone not enrolled in
// every track") is handled by scoring each learner against ONLY the live tracks
// they're actually enrolled in.

import { createServiceClient } from "@/lib/supabase/server";
import type { ProgramScope } from "@/lib/programs/scope";
import { getLearnerActivity } from "@/lib/analytics/activity";
import { getProgram, getProgramWithOverrides } from "@/lib/programs/server";
import { trackModality } from "@/lib/analytics/modality";
import {
  summarizeStudent,
  MIN_SESSIONS_FOR_RISK,
  type AttendanceRecord,
  type TrackLike,
} from "@/lib/attendance/compute";

export type FunnelStage = { label: string; count: number };

export type RiskBucket = "on-track" | "at-risk" | "disengaged";

export type AtRiskStudent = {
  id: string;
  name: string;
  email: string;
  signal: string;
};

export type AcquisitionData = {
  inviteFunnel: FunnelStage[];
  activationFunnel: FunnelStage[];
  risk: Record<RiskBucket, number>;
  needsAttention: AtRiskStudent[];
  /**
   * Learners whose every enrolled course has ENDED (last dated unit is in the
   * past). They are set aside from the risk buckets: "no activity in 21 days"
   * after a course finishes is not a signal anyone should act on. BGC's
   * Overview read "90 learners need a check-in" for two bootcamps that were
   * over (audit 2026-08-18, F8).
   */
  completedCohortCount: number;
};

const DAY = 86_400_000;
const AT_RISK_DAYS = 7; // last signal older than a week → drifting
const DISENGAGED_DAYS = 21; // older than three weeks → disengaged

export async function fetchAcquisitionData(scope: ProgramScope): Promise<AcquisitionData> {
  const svc = createServiceClient();
  const ids = scope.ids;

  const [studentsRes, invitesRes, activity, enrollRes, attendanceRes, program] =
    await Promise.all([
      svc
        .from("students")
        .select("id, first_name, last_name, email, role, onboarding_completed, last_seen_at")
        .in("program_id", ids)
        .eq("role", "student")
        .eq("is_test", false)
        .eq("is_staff", false), // staff (employees) aren't learners
      // invites are keyed by program_slug, not program_id.
      svc.from("invites").select("email, used_at").in("program_slug", scope.slugs),
      getLearnerActivity(scope),
      // Enrollments + attendance drive the live-track risk model below.
      svc.from("student_tracks").select("student_id, track_slug").in("program_id", ids),
      svc
        .from("attendance")
        .select("id, student_id, track, week_number, session_number, checked_in_at, marked_by")
        .in("program_id", ids),
      getProgram(),
    ]);
  // Hidden courses still exist and their learners still deserve the fair
  // rate model. getProgram() is hidden-filtered (right for the learner nav),
  // so score against the overrides-aware full course list instead.
  const fullProgram = await getProgramWithOverrides(program.slug);

  const students = studentsRes.data ?? [];
  const invites = invitesRes.data ?? [];
  const enrollments = (enrollRes.data ?? []) as { student_id: string; track_slug: string }[];
  const attendanceRecords = (attendanceRes.data ?? []) as AttendanceRecord[];

  // The live tracks each learner is actually enrolled in — scoring against only
  // these is what makes rate-based risk fair for someone not in every track.
  const liveBySlug = new Map<string, TrackLike>(
    (fullProgram.tracks ?? [])
      .filter((t) => trackModality(t) === "live")
      .map((t) => [t.slug, t as TrackLike]),
  );
  // A course has ended when its last dated unit is in the past. Undated tracks
  // (TS-config cohorts) fall back to startDate + totalWeeks*7 days.
  const todayKey = new Date().toISOString().slice(0, 10);
  const endedSlugs = new Set<string>();
  for (const t of fullProgram.tracks ?? []) {
    const dated = (t.weekSummaries ?? []).map((u) => u.date).filter((d): d is string => !!d).sort();
    let ended = false;
    if (dated.length) ended = dated[dated.length - 1] < todayKey;
    else if (t.startDate && !t.startDateTbd && t.totalWeeks) {
      const end = new Date(t.startDate);
      end.setDate(end.getDate() + t.totalWeeks * 7);
      ended = end.toISOString().slice(0, 10) < todayKey;
    }
    if (ended) endedSlugs.add(t.slug);
  }
  const enrolledSlugsByStudent = new Map<string, Set<string>>();
  for (const e of enrollments) {
    let set = enrolledSlugsByStudent.get(e.student_id);
    if (!set) { set = new Set(); enrolledSlugsByStudent.set(e.student_id, set); }
    set.add(e.track_slug);
  }
  const liveTracksByStudent = new Map<string, TrackLike[]>();
  for (const e of enrollments) {
    const t = liveBySlug.get(e.track_slug);
    if (!t) continue;
    const list = liveTracksByStudent.get(e.student_id) ?? [];
    list.push(t);
    liveTracksByStudent.set(e.student_id, list);
  }

  // ── Invite funnel ──────────────────────────────────────────────────────────
  const invitedEmails = new Set<string>();
  const acceptedEmails = new Set<string>();
  for (const i of invites) {
    if (!i.email) continue;
    const e = i.email.toLowerCase();
    invitedEmails.add(e);
    if (i.used_at) acceptedEmails.add(e);
  }
  const inviteFunnel: FunnelStage[] = [
    { label: "Invited", count: invitedEmails.size },
    { label: "Accepted", count: acceptedEmails.size },
  ];

  // ── Last signal per student (max of any activity timestamp + last login) ─────
  const lastSignal = new Map<string, number>();
  const bump = (id: string, iso: string | null) => {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return;
    lastSignal.set(id, Math.max(lastSignal.get(id) ?? 0, t));
  };
  for (const r of activity) bump(r.student_id, r.at);
  // Activated-ever = has at least one activity record (login alone doesn't count
  // as "doing the work", so capture activity before folding in last_seen_at).
  const activatedIds = new Set(lastSignal.keys());

  // ── Activation funnel ────────────────────────────────────────────────────────
  const signedUp = students.length;
  const onboarded = students.filter((s) => s.onboarding_completed).length;
  const activated = students.filter((s) => activatedIds.has(s.id)).length;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY;
  // Fold logins into the recency signal now (for risk), after activation count.
  for (const s of students) bump(s.id, s.last_seen_at);
  const active7d = students.filter((s) => (lastSignal.get(s.id) ?? 0) >= sevenDaysAgo).length;

  const activationFunnel: FunnelStage[] = [
    { label: "Signed up", count: signedUp },
    { label: "Onboarded", count: onboarded },
    { label: "Activated", count: activated },
    { label: "Active (7d)", count: active7d },
  ];

  // ── Risk buckets + needs-attention list ──────────────────────────────────────
  const risk: Record<RiskBucket, number> = {
    "on-track": 0,
    "at-risk": 0,
    disengaged: 0,
  };
  // Severity carried alongside the row so sorting never has to re-parse the
  // human-readable signal string (which now differs per model).
  const atRisk: (AtRiskStudent & { severity: number })[] = [];
  let completedCohortCount = 0;
  for (const s of students) {
    // Every course this learner is in has ended → not a risk case at all.
    const mine = enrolledSlugsByStudent.get(s.id);
    if (mine && mine.size > 0 && [...mine].every((slug) => endedSlugs.has(slug))) {
      completedCohortCount++;
      continue;
    }
    const liveTracks = liveTracksByStudent.get(s.id) ?? [];
    let bucket: RiskBucket;
    let signal: string;
    let severity: number;

    // Live learner with enough recorded sessions → judged on showing up, via the
    // same summarizeStudent() the Attendance tab uses, so the two surfaces can
    // never disagree.
    const summary =
      liveTracks.length > 0
        ? summarizeStudent(
            {
              id: s.id,
              first_name: s.first_name ?? "",
              last_name: s.last_name ?? "",
              email: s.email ?? "",
            },
            liveTracks,
            attendanceRecords,
          )
        : null;

    if (summary && summary.expected >= MIN_SESSIONS_FOR_RISK) {
      bucket = summary.status;
      signal = `${summary.attended}/${summary.expected} sessions`;
      // Worst rate first; a missed streak breaks ties.
      severity = (100 - summary.rate) * 10 + summary.consecutiveMisses;
    } else {
      // Either no live track to miss, or too few recorded sessions to judge
      // attendance yet. Recency is then the only honest signal — falling through
      // to "on-track" here would hide a learner who has genuinely gone quiet.
      const last = lastSignal.get(s.id) ?? 0;
      const daysSince = last === 0 ? Infinity : Math.floor((now - last) / DAY);
      if (daysSince <= AT_RISK_DAYS) bucket = "on-track";
      else if (daysSince <= DISENGAGED_DAYS) bucket = "at-risk";
      else bucket = "disengaged";
      signal = last === 0 ? "Never active" : `No activity in ${daysSince}d`;
      severity = daysSince === Infinity ? Number.MAX_SAFE_INTEGER : daysSince;
    }

    risk[bucket]++;
    if (bucket !== "on-track") {
      const name =
        [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.email || "—";
      atRisk.push({ id: s.id, name, email: s.email ?? "", signal, severity });
    }
  }
  // Most severe first.
  atRisk.sort((a, b) => b.severity - a.severity);

  return {
    inviteFunnel,
    activationFunnel,
    risk,
    completedCohortCount,
    // `severity` is an internal sort key, not part of the surface contract.
    needsAttention: atRisk
      .slice(0, 12)
      .map(({ id, name, email, signal }) => ({ id, name, email, signal })),
  };
}
