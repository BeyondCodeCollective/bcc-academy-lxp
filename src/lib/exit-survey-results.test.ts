import { describe, expect, it } from "vitest";
import { summarizeBySession, type ExitSurveyResult } from "./exit-survey-results";

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
