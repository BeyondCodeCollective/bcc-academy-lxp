import { expect, it } from "vitest";
import { evaluateMvpCourseCheckIns } from "./check-ins";

// Query-adapter tests ensure incomplete attendance never becomes an accusation.
const at = new Date("2026-10-01T18:00:00Z");
const held = [{ weekNumber: 1, sessionNumber: 1, label: "Session one" }];
const attendance = [{ id: "r1", student_id: "a", track: "course", week_number: 1, session_number: 1, checked_in_at: null }];
it("recognizes positive attendance without flagging", () => {
  const result = evaluateMvpCourseCheckIns("row", "course", ["a"], attendance, held, at);
  expect(result.learnersNeedingCheckIn).toBe(0);
  expect(result.evaluations[0].checkInStatus).toBe("no_flags");
});
it("keeps missing check-ins unevaluated", () => {
  const result = evaluateMvpCourseCheckIns("row", "course", ["a", "b"], attendance, held, at);
  expect(result.learnersNeedingCheckIn).toBeNull();
  expect(result.evaluations[1].checkInStatus).toBe("not_evaluated");
});
it("cannot use a different course's check-ins", () => {
  expect(evaluateMvpCourseCheckIns("row", "other", ["a"], attendance, held, at).learnersNeedingCheckIn).toBeNull();
});
it("keeps an unavailable schedule unevaluated", () => {
  expect(evaluateMvpCourseCheckIns("row", "course", ["a"], attendance, null, at).evaluations[0].checkInStatus).toBe("not_evaluated");
});
