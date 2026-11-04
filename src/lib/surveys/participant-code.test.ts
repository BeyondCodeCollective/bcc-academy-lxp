import { describe, expect, it } from "vitest";
import { isParticipantCodedSurvey, NO_PARTICIPANT_CODE, withParticipantCode } from "./participant-code";

const row = {
  survey_type: "field-ready-pre",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  source: "authenticated" as const,
  responses: {
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    zip_code: "10001",
    date_of_birth: "2004-01-01",
    confidence: 4,
    _cohort_track: "field-ready",
  },
};

describe("withParticipantCode", () => {
  it("shows the code instead of the name and drops the email", () => {
    const out = withParticipantCode(row, "P-7K3QX9");
    expect(out.full_name).toBe("P-7K3QX9");
    expect(out.participant_code).toBe("P-7K3QX9");
    expect(out.email).toBe("");
  });

  it("strips identifying answers but keeps the rest", () => {
    const out = withParticipantCode(row, "P-7K3QX9");
    expect(out.responses).toEqual({ confidence: 4, _cohort_track: "field-ready" });
  });

  it("never falls back to the name when the code is missing", () => {
    const out = withParticipantCode(row, null);
    expect(out.full_name).toBe(NO_PARTICIPANT_CODE);
    expect(JSON.stringify(out)).not.toContain("Ada");
  });

  it("leaves other row fields alone", () => {
    expect(withParticipantCode(row, "P-1").survey_type).toBe("field-ready-pre");
  });
});

describe("isParticipantCodedSurvey", () => {
  it("is off for surveys that need names, like the intake", () => {
    expect(isParticipantCodedSurvey("bcc-learner-intake")).toBe(false);
  });

  it("is off for unknown ids", () => {
    expect(isParticipantCodedSurvey("does-not-exist")).toBe(false);
  });
});
