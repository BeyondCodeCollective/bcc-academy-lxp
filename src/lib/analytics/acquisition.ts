// Acquisition & Risk analytics — "are people getting in and starting, and who
// needs help now?"
//
// Two funnels (each monotonic within itself, so the bars never read backwards):
//   • Invite funnel:     Invited → Accepted          (from `invites`)
//   • Activation funnel: Signed up → Onboarded → Activated → Active (7d)
//                                                     (from `students` + activity)
//
// Risk is recency-based, not attendance-rate-based: a learner is scored by how
// long since their last signal (attendance, submission, reflection, or login).
// Attendance-rate scoring (src/lib/attendance/compute.ts) mis-penalizes anyone
// not enrolled in every track when run BCC-wide, so recency is the correct
// cross-program signal.

import { createServiceClient } from "@/lib/supabase/server";
import type { ProgramScope } from "@/lib/programs/scope";
import { getLearnerActivity } from "@/lib/analytics/activity";

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
};

const DAY = 86_400_000;
const AT_RISK_DAYS = 7; // last signal older than a week → drifting
const DISENGAGED_DAYS = 21; // older than three weeks → disengaged

export async function fetchAcquisitionData(scope: ProgramScope): Promise<AcquisitionData> {
  const svc = createServiceClient();
  const ids = scope.ids;

  const [studentsRes, invitesRes, activity] = await Promise.all([
    svc
      .from("students")
      .select("id, first_name, last_name, email, role, onboarding_completed, last_seen_at")
      .in("program_id", ids)
      .eq("role", "student")
      .eq("is_test", false),
    // invites are keyed by program_slug, not program_id.
    svc.from("invites").select("email, used_at").in("program_slug", scope.slugs),
    getLearnerActivity(scope),
  ]);

  const students = studentsRes.data ?? [];
  const invites = invitesRes.data ?? [];

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
  const atRisk: AtRiskStudent[] = [];
  for (const s of students) {
    const last = lastSignal.get(s.id) ?? 0;
    const daysSince = last === 0 ? Infinity : Math.floor((now - last) / DAY);
    let bucket: RiskBucket;
    if (daysSince <= AT_RISK_DAYS) bucket = "on-track";
    else if (daysSince <= DISENGAGED_DAYS) bucket = "at-risk";
    else bucket = "disengaged";
    risk[bucket]++;
    if (bucket !== "on-track") {
      const name =
        [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.email || "—";
      atRisk.push({
        id: s.id,
        name,
        email: s.email ?? "",
        signal: last === 0 ? "Never active" : `No activity in ${daysSince}d`,
      });
    }
  }
  // Most-disengaged first; "Never active" (Infinity) floats to the top.
  atRisk.sort((a, b) => {
    const av = a.signal === "Never active" ? Infinity : parseInt(a.signal.match(/\d+/)?.[0] ?? "0", 10);
    const bv = b.signal === "Never active" ? Infinity : parseInt(b.signal.match(/\d+/)?.[0] ?? "0", 10);
    return bv - av;
  });

  return {
    inviteFunnel,
    activationFunnel,
    risk,
    needsAttention: atRisk.slice(0, 12),
  };
}
