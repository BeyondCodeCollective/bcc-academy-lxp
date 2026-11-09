import { describe, expect, it } from "vitest";
import {
  completionBySession,
  sortUntraceable,
  summarizeBySession,
  type ExitSurveyResult,
} from "./exit-survey-results";

const row = (
  week: number,
  session: number,
  understanding: number | null,
  unclear_text: string | null = null,
): ExitSurveyResult => ({
  week_number: week,
  session_number: session,
  understanding,
  unclear_text,
  hours_text: null,
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

describe("sortUntraceable", () => {
  it("orders by session, then rating, then text, never by arrival", () => {
    const out = sortUntraceable([row(1, 1, 5, "b"), row(1, 2, 1), row(1, 1, 2), row(1, 1, 5, "a")]);
    expect(out.map((r) => [r.session_number, r.understanding, r.unclear_text])).toEqual([
      [1, 2, null],
      [1, 5, "a"],
      [1, 5, "b"],
      [2, 1, null],
    ]);
  });

  it("carries no per-person or time fields", () => {
    const [r] = sortUntraceable([row(1, 1, 3)]);
    expect(Object.keys(r).sort()).toEqual(
      ["hours_text", "session_number", "unclear_text", "understanding", "week_number"],
    );
  });
});

describe("completionBySession", () => {
  const enrolled = ["a", "b", "c"];

  it("counts who has rated each session, with no names", () => {
    const out = completionBySession(enrolled, [
      { student_id: "a", week_number: 1, session_number: 1 },
      { student_id: "a", week_number: 1, session_number: 2 },
      { student_id: "b", week_number: 1, session_number: 2 },
    ]);
    expect(out).toEqual([
      { week: 1, session: 1, answered: 1, enrolled: 3 },
      { week: 1, session: 2, answered: 2, enrolled: 3 },
    ]);
  });

  it("ignores ratings from people no longer enrolled", () => {
    const [s] = completionBySession(enrolled, [{ student_id: "gone", week_number: 2, session_number: 1 }]);
    expect(s.answered).toBe(0);
  });

  it("returns nothing before anyone has rated", () => {
    expect(completionBySession(enrolled, [])).toEqual([]);
  });
});
