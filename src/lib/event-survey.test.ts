import { describe, expect, it } from "vitest";
import { SURVEY_SAMPLE_CSV, parseSurveyCsv, validateAnswers } from "./event-survey";

describe("parseSurveyCsv", () => {
  it("parses the sample template", () => {
    const r = parseSurveyCsv(SURVEY_SAMPLE_CSV);
    expect(r.ok && r.questions.map((q) => q.type)).toEqual(["rating", "yesno", "choice", "text"]);
    expect(r.ok && r.questions[2].options).toEqual(["Robotics", "Game design", "Web basics"]);
  });
  it("rejects unknown types and one-option choices", () => {
    expect(parseSurveyCsv("question,type\nHi,banana").ok).toBe(false);
    expect(parseSurveyCsv("question,type,options\nPick,choice,Only").ok).toBe(false);
  });
  it("needs a question column", () => {
    expect(parseSurveyCsv("a,b\n1,2").ok).toBe(false);
  });
});

describe("validateAnswers", () => {
  const questions = [
    { prompt: "R", type: "rating" as const },
    { prompt: "C", type: "choice" as const, options: ["a", "b"] },
  ];
  it("accepts valid answers and blanks", () => {
    expect(validateAnswers(questions, [4, null]).ok).toBe(true);
  });
  it("rejects out-of-range, unknown options, and empty submissions", () => {
    expect(validateAnswers(questions, [9, null]).ok).toBe(false);
    expect(validateAnswers(questions, [null, "z"]).ok).toBe(false);
    expect(validateAnswers(questions, [null, null]).ok).toBe(false);
  });
});
