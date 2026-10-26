import type { MvpSessionSlot } from "./milestones";

export type ParticipantActivity = {
  learnerId: string; courseSlug: string; kind: "submission" | "reflection" | "video";
  weekNumber: number; at: string | null;
};
export type ParticipantRequirement = {
  kind: "attendance" | ParticipantActivity["kind"];
  weekNumber: number;
  sessionNumber?: number;
  dueAt: string;
};
export type ParticipantProgressPolicy = {
  programSlug: string; courseSlug: string;
  // Each mapped session lists ALL of its requirements, not an inferred sample.
  sessions: readonly { weekNumber: number; sessionNumber: number; requirements: readonly ParticipantRequirement[] }[];
};

// No live rules are guessed from submissions_enabled or reflection settings.
export const MVP_PARTICIPANT_PROGRESS_POLICIES: readonly ParticipantProgressPolicy[] = [];

export function getParticipantProgressPolicy(programSlug: string, courseSlug: string) {
  const matches = MVP_PARTICIPANT_PROGRESS_POLICIES.filter(p => p.programSlug === programSlug && p.courseSlug === courseSlug);
  if (matches.length > 1) throw new Error("Duplicate participant progress policy.");
  return matches[0] ?? null;
}

// A session counts only when ALL applicable requirements are satisfied.
// No action-type weights, furthest-week shortcuts, or certificate inference.
export function calculateParticipantProgress(input: {
  programSlug: string; courseSlug: string; learnerId: string; asOf: Date;
  heldSessions: readonly MvpSessionSlot[] | null; policy: ParticipantProgressPolicy | null;
  activities: readonly ParticipantActivity[];
  attendance: (week: number, session: number) => boolean | null;
}) {
  const now = input.asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid participant evaluation date.");
  const unavailable = (reason: string) => ({ percent: null, completedSessions: null, applicableSessions: null, unavailableReason: reason });
  if (!input.policy) return unavailable("Complete participant requirements are not configured for this offering.");
  if (input.policy.programSlug !== input.programSlug || input.policy.courseSlug !== input.courseSlug) throw new Error("Participant policy scope mismatch.");
  if (!input.heldSessions?.length) return unavailable("No complete, verified held-session denominator is available.");
  const key = (s: { weekNumber: number; sessionNumber: number }) => `${s.weekNumber}:${s.sessionNumber}`;
  const policy = new Map(input.policy.sessions.map(s => [key(s), s]));
  if (policy.size !== input.policy.sessions.length || input.policy.sessions.some(s =>
    !Number.isInteger(s.weekNumber) || s.weekNumber < 1 || !Number.isInteger(s.sessionNumber) || s.sessionNumber < 1 || !s.requirements.length ||
    s.requirements.some(r => !Number.isInteger(r.weekNumber) || r.weekNumber < 1 ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(r.dueAt) || !Number.isFinite(Date.parse(r.dueAt)) ||
      (r.kind === "attendance" && (!Number.isInteger(r.sessionNumber) || r.sessionNumber! < 1))))) {
    throw new Error("Invalid participant progress requirements.");
  }
  let completedSessions = 0;
  let applicableSessions = 0;
  for (const slot of new Map(input.heldSessions.map(s => [key(s), s])).values()) {
    const mapped = policy.get(key(slot));
    if (!mapped) return unavailable("Some held sessions lack confirmed requirements.");
    const due = mapped.requirements.filter(r => Date.parse(r.dueAt) <= now);
    if (!due.length) continue;
    let complete = true;
    for (const requirement of due) {
      let satisfied: boolean | null;
      if (requirement.kind === "attendance") satisfied = input.attendance(requirement.weekNumber, requirement.sessionNumber!);
      else {
        const times = input.activities.filter(a => a.learnerId === input.learnerId && a.courseSlug === input.courseSlug &&
          a.kind === requirement.kind && a.weekNumber === requirement.weekNumber && a.at !== null).map(a => Date.parse(a.at!));
        satisfied = times.some(t => !Number.isFinite(t) || t > now) ? null : times.length > 0;
      }
      if (satisfied === null) return unavailable("Some required activity evidence is unavailable or conflicting.");
      if (!satisfied) complete = false;
    }
    applicableSessions++;
    if (complete) completedSessions++;
  }
  if (!applicableSessions) return unavailable("No mapped requirements are due yet.");
  return { percent: completedSessions / applicableSessions * 100, completedSessions, applicableSessions, unavailableReason: null };
}

// Only course-scoped learner actions; never profile-wide activity, review edits,
// or attendance entry timestamps whose actor cannot be established.
export function participantLastActivity(activities: readonly ParticipantActivity[], learnerId: string, courseSlug: string, asOf: Date) {
  const now = asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid participant evaluation date.");
  const times = activities.filter(a => a.learnerId === learnerId && a.courseSlug === courseSlug && a.at !== null).map(a => Date.parse(a.at!));
  if (times.some(t => !Number.isFinite(t) || t > now)) return { at: null, status: "unavailable" as const };
  return times.length ? { at: new Date(times.reduce((latest, time) => Math.max(latest, time), -Infinity)).toISOString(), status: "recorded" as const }
    : { at: null, status: "none_recorded" as const };
}
