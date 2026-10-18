import { describe, expect, it } from "vitest";
import { calculateParticipantProgress, participantLastActivity, type ParticipantProgressPolicy, type ParticipantActivity } from "./participant-progress";

const asOf = new Date("2026-10-16T12:00:00Z");
const dueAt = "2026-10-01T12:00:00Z";
const slots = [1, 2].map(weekNumber => ({ weekNumber, sessionNumber: 1, label: `Week ${weekNumber}` }));
const policy: ParticipantProgressPolicy = { programSlug: "p", courseSlug: "c", sessions: slots.map(s => ({ ...s,
  requirements: [{ kind: "attendance", weekNumber: s.weekNumber, sessionNumber: 1, dueAt },
    { kind: "submission", weekNumber: s.weekNumber, dueAt }],
})) };
const activity = (weekNumber: number): ParticipantActivity => ({ learnerId: "u", courseSlug: "c", kind: "submission", weekNumber, at: dueAt });
const input = { programSlug: "p", courseSlug: "c", learnerId: "u", asOf, heldSessions: slots, policy,
  activities: [activity(1)], attendance: () => true };

describe("participant caught-up progress", () => {
  it("counts satisfied held sessions, not future weeks or extra actions", () => {
    expect(calculateParticipantProgress({ ...input, activities: [activity(1), activity(1), activity(8)] })).toMatchObject({ percent: 50, completedSessions: 1, applicableSessions: 2 });
    expect(calculateParticipantProgress({ ...input, activities: [activity(1), activity(2)] }).percent).toBe(100);
  });
  it("does not let submitted work compensate for missing attendance", () => {
    expect(calculateParticipantProgress({ ...input, activities: [activity(1), activity(2)], attendance: () => false }).percent).toBe(0);
    expect(calculateParticipantProgress({ ...input, attendance: () => null }).percent).toBeNull();
  });
  it("requires a complete mapping and held denominator", () => {
    expect(calculateParticipantProgress({ ...input, policy: null }).percent).toBeNull();
    expect(calculateParticipantProgress({ ...input, heldSessions: null }).percent).toBeNull();
    expect(calculateParticipantProgress({ ...input, policy: { ...policy, sessions: policy.sessions.slice(0, 1) } }).percent).toBeNull();
  });
  it("ignores requirements not yet due and never shares another learner's work", () => {
    const future = { ...policy, sessions: policy.sessions.map(s => ({ ...s, requirements: s.requirements.map(r => ({ ...r, dueAt: "2027-01-01T00:00:00Z" })) })) };
    expect(calculateParticipantProgress({ ...input, policy: future }).percent).toBeNull();
    expect(calculateParticipantProgress({ ...input, activities: [{ ...activity(1), learnerId: "other" }] }).percent).toBe(0);
  });
  it("fails closed on mismatched policies or malformed timestamps", () => {
    expect(() => calculateParticipantProgress({ ...input, programSlug: "other" })).toThrow("scope mismatch");
    expect(calculateParticipantProgress({ ...input, activities: [{ ...activity(1), at: "bad" }] }).percent).toBeNull();
  });
  it("handles required reflections and video evidence without counting drafts", () => {
    const mapped: ParticipantProgressPolicy = { ...policy, sessions: [{ ...slots[0], requirements: [
      { kind: "reflection", weekNumber: 1, dueAt }, { kind: "video", weekNumber: 1, dueAt },
    ] }] };
    const reflection: ParticipantActivity = { ...activity(1), kind: "reflection" };
    const video: ParticipantActivity = { ...activity(1), kind: "video" };
    expect(calculateParticipantProgress({ ...input, policy: mapped, heldSessions: slots.slice(0, 1), activities: [reflection, video] }).percent).toBe(100);
    expect(calculateParticipantProgress({ ...input, policy: mapped, heldSessions: slots.slice(0, 1), activities: [reflection, { ...video, at: null }] }).percent).toBe(0);
  });
});

describe("scoped last learner action", () => {
  it("uses exact course/learner action timestamps and preserves time", () => {
    expect(participantLastActivity([activity(1), { ...activity(1), courseSlug: "other", at: asOf.toISOString() }], "u", "c", asOf))
      .toEqual({ at: "2026-10-01T12:00:00.000Z", status: "recorded" });
    expect(participantLastActivity([], "u", "c", asOf).status).toBe("none_recorded");
  });
  it("does not silently hide invalid or future evidence", () => {
    expect(participantLastActivity([{ ...activity(1), at: "bad" }], "u", "c", asOf).status).toBe("unavailable");
    expect(participantLastActivity([{ ...activity(1), at: "2027-01-01T00:00:00Z" }], "u", "c", asOf).status).toBe("unavailable");
  });
});
