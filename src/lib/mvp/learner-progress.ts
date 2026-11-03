import "server-only";
import { getMvpProgramParticipants } from "./detail-queries";
import { calculateParticipantProgress, getParticipantProgressPolicy } from "./participant-progress";

type Progress = { percent: number | null; completedSessions: number | null;
  applicableSessions: number | null; unavailableReason: string | null };
type Enrollment = { programId: string; courseSlug: string };
type Learner = { id: string; enrollments: Enrollment[] };
const key = (enrollment: Enrollment) => JSON.stringify([enrollment.programId, enrollment.courseSlug]);

// Internal enrichment of an already authorized, paginated directory. Reuse the
// participant loader's session/requirement calculation, not aggregate video rates.
// That loader rechecks access and reads timestamp metadata, never private work.
export async function loadLearnerProgress<T extends Learner>(
  directory: T[], programs: readonly { id: string; slug: string }[],
): Promise<Array<Omit<T, "enrollments"> & { enrollments: Array<T["enrollments"][number] & { caughtUp: Progress }> }>> {
  const offerings = new Map(directory.flatMap(learner => learner.enrollments.map(enrollment => [key(enrollment), enrollment] as const)));
  const results = new Map<string, Map<string, Progress>>();
  const unavailable = new Map<string, Progress>();
  const asOf = new Date();
  for (const [offeringKey, enrollment] of offerings) {
    const program = programs.find(row => row.id === enrollment.programId);
    if (!program) throw new Error("Learner progress scope is unavailable.");
    const policy = getParticipantProgressPolicy(program.slug, enrollment.courseSlug);
    if (!policy) {
      unavailable.set(offeringKey, calculateParticipantProgress({
        programSlug: program.slug, courseSlug: enrollment.courseSlug, learnerId: "",
        asOf, policy: null, heldSessions: null, activities: [], attendance: () => null,
      }));
      continue;
    }
    // One sequential request per configured offering, not one per learner.
    // Existing participant reads are batched and cursor-paginated internally.
    const data = await getMvpProgramParticipants({ programId: enrollment.programId, courseSlug: enrollment.courseSlug });
    const selected = new Set(directory.filter(learner => learner.enrollments.some(row => key(row) === offeringKey)).map(learner => learner.id));
    const byLearner = new Map<string, Progress>();
    for (const participant of data.participants) {
      if (participant.programId !== enrollment.programId || participant.courseSlug !== enrollment.courseSlug) throw new Error("Learner progress scope mismatch.");
      if (!selected.has(participant.learnerId)) continue;
      if (byLearner.has(participant.learnerId)) throw new Error("Duplicate learner progress records.");
      // Explicit projection: do not attach the participant profile or evidence.
      const { percent, completedSessions, applicableSessions, unavailableReason } = participant.caughtUp;
      byLearner.set(participant.learnerId, { percent, completedSessions, applicableSessions, unavailableReason });
    }
    if (byLearner.size !== selected.size) throw new Error("Selected learner progress is unavailable.");
    results.set(offeringKey, byLearner);
  }
  return directory.map(learner => ({ ...learner, enrollments: learner.enrollments.map(enrollment => ({
    ...(enrollment as T["enrollments"][number]),
    caughtUp: unavailable.get(key(enrollment)) ?? results.get(key(enrollment))!.get(learner.id)!,
  })) }));
}
