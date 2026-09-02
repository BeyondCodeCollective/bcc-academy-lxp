import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getEnabledAutomations,
  type NudgeRule,
  type TrackAutomation,
} from "@/lib/automation/rules";
import { issueCertificateCore } from "@/lib/certificates";
import { sendNudgeEmail } from "@/lib/email";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";

// The nightly automation pass. For every course with rules switched on:
//   1. auto-certificates — learners meeting the completion rule get their
//      certificate issued + emailed (idempotent via track_completions).
//   2. nudges — learners matching a nudge rule get one templated email, once
//      per rule ever (automation_nudges is the send log AND the guard).
// Deliberately scan-based, not event-triggered (the Brightspace Intelligent
// Agents model): one pass a day is debuggable, rate-limitable, and can't storm.

const DAY_MS = 86_400_000;
// Safety valve: a misconfigured rule on a big course must not blast the whole
// roster in one night. The remainder goes out on following nights.
const MAX_NUDGES_PER_RUN = 50;
const EMAIL_PACE_MS = 550; // ~2/sec — Resend rate limit
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AutomationRunResult = {
  tracks: number;
  certificatesIssued: { trackSlug: string; studentId: string; email: string }[];
  nudgesSent: { trackSlug: string; studentId: string; ruleId: string; email: string }[];
  errors: string[];
};

type LearnerState = {
  studentId: string;
  email: string;
  firstName: string;
  enrolledAt: number;
  lessonsWatched: number;
  submissions: number;
  /** Latest of telemetry, lesson watches, submissions. Null = never active. */
  lastActiveAt: number | null;
  completed: boolean;
};

async function loadLearnerStates(
  svc: SupabaseClient,
  auto: TrackAutomation,
): Promise<LearnerState[]> {
  const { data: enrollments } = await svc
    .from("student_tracks")
    .select("student_id, created_at, students!inner(id, email, first_name, is_staff, is_test)")
    .eq("track_slug", auto.trackSlug);
  const rows = (enrollments ?? []).filter((r) => {
    const s = r.students as unknown as { is_staff: boolean | null; is_test: boolean | null };
    return !s.is_staff && !s.is_test;
  });
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.student_id as string);

  const [watched, subs, certs, events] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, video_watched_at")
      .eq("track_slug", auto.trackSlug)
      .in("user_id", ids)
      .not("video_watched_at", "is", null),
    svc
      .from("submissions")
      .select("student_id, submitted_at")
      .eq("track_slug", auto.trackSlug)
      .in("student_id", ids),
    svc
      .from("track_completions")
      .select("student_id")
      .eq("track_slug", auto.trackSlug)
      .eq("program_id", auto.programId)
      .in("student_id", ids),
    svc
      .from("activity_events")
      .select("user_id, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(20_000),
  ]);

  const latest = new Map<string, number>();
  const bump = (id: string, iso: string | null) => {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (t > (latest.get(id) ?? 0)) latest.set(id, t);
  };
  const watchCount = new Map<string, number>();
  for (const w of watched.data ?? []) {
    watchCount.set(w.user_id, (watchCount.get(w.user_id) ?? 0) + 1);
    bump(w.user_id, w.video_watched_at);
  }
  const subCount = new Map<string, number>();
  for (const s of subs.data ?? []) {
    subCount.set(s.student_id, (subCount.get(s.student_id) ?? 0) + 1);
    bump(s.student_id, s.submitted_at);
  }
  for (const e of events.data ?? []) bump(e.user_id, e.created_at);
  const completedIds = new Set((certs.data ?? []).map((c) => c.student_id as string));

  return rows.map((r) => {
    const s = r.students as unknown as {
      id: string;
      email: string | null;
      first_name: string | null;
    };
    return {
      studentId: r.student_id as string,
      email: s.email ?? "",
      firstName: s.first_name ?? "",
      enrolledAt: new Date(r.created_at as string).getTime(),
      lessonsWatched: watchCount.get(r.student_id as string) ?? 0,
      submissions: subCount.get(r.student_id as string) ?? 0,
      lastActiveAt: latest.get(r.student_id as string) ?? null,
      completed: completedIds.has(r.student_id as string),
    };
  });
}

function meetsCompletion(l: LearnerState, auto: TrackAutomation, videoWeeks: number): boolean {
  const need = auto.completion.lessons === "all" ? videoWeeks : auto.completion.lessons;
  if (need <= 0) return false; // a course with no lessons can't auto-complete
  if (l.lessonsWatched < need) return false;
  if (auto.completion.submissions && l.submissions < auto.completion.submissions) return false;
  return true;
}

function matchNudge(l: LearnerState, rule: NudgeRule, now: number): boolean {
  if (l.completed) return false;
  const started = l.lessonsWatched > 0 || l.submissions > 0;
  if (rule.id === "never-started") {
    return !started && now - l.enrolledAt >= rule.afterDays * DAY_MS;
  }
  // stalled: reached content once, then went quiet
  return (
    started &&
    l.lastActiveAt !== null &&
    now - l.lastActiveAt >= rule.afterDays * DAY_MS
  );
}

export async function runTrackAutomation(
  svc: SupabaseClient,
  now: Date = new Date(),
): Promise<AutomationRunResult> {
  const result: AutomationRunResult = {
    tracks: 0,
    certificatesIssued: [],
    nudgesSent: [],
    errors: [],
  };
  const automations = await getEnabledAutomations(svc);
  result.tracks = automations.length;
  let nudgeBudget = MAX_NUDGES_PER_RUN;

  for (const auto of automations) {
    try {
      const [learners, programRow] = await Promise.all([
        loadLearnerStates(svc, auto),
        svc.from("programs").select("slug, name").eq("id", auto.programId).maybeSingle(),
      ]);
      const programSlug = (programRow.data?.slug as string | undefined) ?? "";
      const programName = (programRow.data?.name as string | undefined) ?? "BCC Academy";
      const program = programSlug ? await getProgramWithOverrides(programSlug) : null;
      const track = program ? getTrackBySlug(program, auto.trackSlug) : undefined;
      const trackName = track?.name ?? auto.trackSlug;
      // Denominator for lessons:"all" — how many weeks of this course carry a
      // video a learner could have watched.
      const videoWeeks = (track?.weeks ?? []).filter((w) => !!w.videoUrl).length;

      // ── 1. Auto-certificates ──
      if (auto.autoCertificate && programSlug) {
        for (const l of learners) {
          if (l.completed || !meetsCompletion(l, auto, videoWeeks)) continue;
          const res = await issueCertificateCore(svc, {
            studentId: l.studentId,
            trackSlug: auto.trackSlug,
            programId: auto.programId,
            programSlug,
            issuedBy: "automation",
          });
          if (res.success && !res.alreadyIssued) {
            result.certificatesIssued.push({
              trackSlug: auto.trackSlug,
              studentId: l.studentId,
              email: l.email,
            });
            await sleepMs(EMAIL_PACE_MS);
          } else if (!res.success) {
            result.errors.push(`cert ${auto.trackSlug}/${l.studentId}: ${res.error}`);
          }
        }
      }

      // ── 2. Nudges ──
      if (auto.nudgesEnabled && auto.nudges.length > 0) {
        const { data: sentRows } = await svc
          .from("automation_nudges")
          .select("student_id, rule_id")
          .eq("track_slug", auto.trackSlug);
        const alreadySent = new Set(
          (sentRows ?? []).map((r) => `${r.student_id}:${r.rule_id}`),
        );

        for (const l of learners) {
          if (!l.email || nudgeBudget <= 0) continue;
          for (const rule of auto.nudges) {
            if (alreadySent.has(`${l.studentId}:${rule.id}`)) continue;
            if (!matchNudge(l, rule, now.getTime())) continue;
            // Claim the log row FIRST — if the insert loses a race or fails,
            // no email goes out; a sent email with no log row can't repeat.
            const { error: logErr } = await svc.from("automation_nudges").insert({
              student_id: l.studentId,
              program_id: auto.programId,
              track_slug: auto.trackSlug,
              rule_id: rule.id,
            });
            if (logErr) continue;
            await sendNudgeEmail({
              to: l.email,
              firstName: l.firstName,
              programName,
              courseName: trackName,
              kind: rule.id,
            });
            result.nudgesSent.push({
              trackSlug: auto.trackSlug,
              studentId: l.studentId,
              ruleId: rule.id,
              email: l.email,
            });
            nudgeBudget--;
            await sleepMs(EMAIL_PACE_MS);
            break; // at most one nudge per learner per night
          }
        }
      }
    } catch (e) {
      result.errors.push(
        `${auto.trackSlug}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  return result;
}
