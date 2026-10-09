import type { MvpAttendanceRecord, MvpSessionSlot } from "./milestones";
import type { MvpAttentionObservation } from "./attention";

// Matches the unapplied review migration. Decisions include historical
// eligibility evidence, not merely membership in today's roster.
export type MvpAttendanceReview = {
  id: string;
  revision: number;
  program_id: string;
  student_id: string;
  track_slug: string;
  week_number: number;
  session_number: number;
  session_held_at: string;
  eligibility: "eligible" | "not_eligible" | "unknown";
  eligibility_basis: string | null;
  outcome: "present" | "absent" | "excused" | "unknown";
  recorded_by: string;
  recorded_at: string;
};

// Caller supplies complete authorized history and required sessions verified
// as held. This pure function performs no reads and never finalizes attendance.
export function verifyMvpMissedSessions(input: {
  programId: string; courseSlug: string; learnerId: string;
  heldRequiredSessions: MvpSessionSlot[] | null;
  reviews: readonly MvpAttendanceReview[];
  attendance: readonly MvpAttendanceRecord[];
  asOf: Date;
}): MvpAttentionObservation & { unknownSessions: number; unavailableReason: string | null } {
  const now = input.asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid attendance verification date.");
  if (!input.heldRequiredSessions?.length) return { value: null, evidence: [], unknownSessions: 0,
    unavailableReason: "No verified required sessions are available for evaluation." };
  const required = new Map(input.heldRequiredSessions.map((slot) => [`${slot.weekNumber}:${slot.sessionNumber}`, slot]));
  const scoped = input.reviews.filter((row) => row.program_id === input.programId &&
    row.track_slug === input.courseSlug && row.student_id === input.learnerId);
  const evidence: MvpAttentionObservation["evidence"] = [];
  let unknownSessions = 0;
  for (const [key, slot] of required) {
    const history = scoped.filter((row) => `${row.week_number}:${row.session_number}` === key &&
      !(Date.parse(row.recorded_at) > now));
    // Bad revisions/timestamps must not expose a stale earlier absence.
    if (!history.length || history.some((row) => !Number.isSafeInteger(row.revision) || row.revision <= 0 ||
      !Number.isFinite(Date.parse(row.recorded_at)))) { unknownSessions++; continue; }
    const latest = Math.max(...history.map((row) => row.revision));
    const candidates = history.filter((row) => row.revision === latest);
    if (candidates.length !== 1) { unknownSessions++; continue; }
    const row = candidates[0];
    const held = Date.parse(row.session_held_at);
    if (!row.id.trim() || !row.recorded_by.trim() || !Number.isFinite(held) || held > Date.parse(row.recorded_at) ||
      row.eligibility === "unknown" || !row.eligibility_basis?.trim()) { unknownSessions++; continue; }
    if (row.eligibility === "not_eligible" && row.outcome === "unknown") continue;
    if (row.eligibility !== "eligible" || !["present", "absent", "excused"].includes(row.outcome)) { unknownSessions++; continue; }
    if (row.outcome !== "absent") continue;
    const conflictingCheckIn = input.attendance.some((record) => record.student_id === input.learnerId &&
      record.track === input.courseSlug && record.week_number === slot.weekNumber && record.session_number === slot.sessionNumber &&
      (record.checked_in_at === null || !Number.isFinite(Date.parse(record.checked_in_at)) || Date.parse(record.checked_in_at) <= now));
    if (conflictingCheckIn) { unknownSessions++; continue; }
    evidence.push({ sourceRecordId: row.id, label: `Staff-confirmed absence: ${slot.label}`, href: null });
  }
  // Two confirmed absences establish the existing threshold even if other
  // sessions remain unknown. Below it, incomplete coverage cannot clear a flag.
  return { value: evidence.length >= 2 || unknownSessions === 0 ? evidence.length : null,
    evidence, unknownSessions,
    unavailableReason: unknownSessions ? "Some required sessions have missing, unresolved, or conflicting staff review evidence." : null };
}
