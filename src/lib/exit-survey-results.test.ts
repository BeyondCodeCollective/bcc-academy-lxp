import { describe, expect, it } from "vitest";
import { completionBySession, summarizeBySession, type ExitSurveyResult } from "./exit-survey-results";

const row = (week: number, session: number, understanding: number | null): ExitSurveyResult => ({
  week_number: week,
  session_number: session,
  understanding,
  unclear_text: null,
  hours_text: null,
  updated_at: "2026-11-09T00:00:00Z",
  participant_code: "P-TEST01",
});

describe("summarizeBySession", () => {
  it("averages ratings per session, ordered by week then session", () => {
    const out = summarizeBySession([row(2, 1, 5), row(1, 2, 3), row(1, 2, 4), row(1, 1, 2)]);
    expect(out).toEqual([
      { week: 1, session: 1, responses: 1, average: 2 },
      { week: 1, session: 2, responses: 2, average: 3.5 },
      { week: 2, session: 1, responses: 1, average: 5 },
    ]);
  });

  it("ignores hours-only rows with no rating", () => {
    expect(summarizeBySession([row(2, 1, null)])).toEqual([]);
  });
});

describe("completionBySession", () => {
  const enrolled = [
    { id: "a", name: "Zoe" },
    { id: "b", name: "Amir" },
    { id: "c", name: "Bea" },
  ];

  it("lists who hasn't rated each session, sorted by name", () => {
    const out = completionBySession(enrolled, [
      { student_id: "a", week_number: 1, session_number: 1 },
      { student_id: "a", week_number: 1, session_number: 2 },
      { student_id: "b", week_number: 1, session_number: 2 },
    ]);
    expect(out).toEqual([
      { week: 1, session: 1, answered: 1, enrolled: 3, missing: ["Amir", "Bea"] },
      { week: 1, session: 2, answered: 2, enrolled: 3, missing: ["Bea"] },
    ]);
  });

  it("ignores ratings from people no longer enrolled", () => {
    const [s] = completionBySession(enrolled, [{ student_id: "gone", week_number: 2, session_number: 1 }]);
    expect(s.answered).toBe(0);
    expect(s.missing).toHaveLength(3);
  });

  it("returns nothing before anyone has rated", () => {
    expect(completionBySession(enrolled, [])).toEqual([]);
  });
});
