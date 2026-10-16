import { describe, it, expect } from "vitest";
import { unansweredRequired, isPageValid, type SurveyQuestion } from "@/components/survey-fields";

const q = (over: Record<string, unknown>) => ({ required: true, label: "Q", ...over }) as unknown as SurveyQuestion;

describe("unansweredRequired", () => {
  it("lists every required question without a valid answer, in page order", () => {
    const qs = [
      q({ id: "consent", type: "consent" }),
      q({ id: "gender", type: "radio", options: ["A"] }),
      q({ id: "race", type: "multi-select", options: ["A"] }),
      q({ id: "note", type: "text", required: false }),
    ];
    expect(unansweredRequired(qs, { consent: true }).map((x) => x.id)).toEqual(["gender", "race"]);
  });

  it("treats an empty multi-select and a blank string as unanswered", () => {
    const qs = [q({ id: "m", type: "multi-select", options: [] }), q({ id: "t", type: "text" })];
    expect(unansweredRequired(qs, { m: [], t: "   " })).toHaveLength(2);
    expect(unansweredRequired(qs, { m: ["x"], t: "hi" })).toHaveLength(0);
  });

  it("needs every statement answered on a likert", () => {
    const qs = [q({ id: "l", type: "likert", statements: ["a", "b"], scale: [] })];
    expect(unansweredRequired(qs, { l: { a: "3" } })).toHaveLength(1);
    expect(unansweredRequired(qs, { l: { a: "3", b: "4" } })).toHaveLength(0);
  });

  it("needs both before and now on every dual-likert statement", () => {
    const qs = [q({ id: "d", type: "dual-likert", statements: ["a", "b"], scale: [] })];
    expect(unansweredRequired(qs, { d: { a: { before: "1", now: "2" }, b: { before: "1" } } })).toHaveLength(1);
    expect(unansweredRequired(qs, { d: { a: { before: "1", now: "2" }, b: { before: "1", now: "3" } } })).toHaveLength(0);
  });

  it("requires a five-digit ZIP on a zip text question", () => {
    const qs = [q({ id: "z", type: "text", zip: true })];
    expect(unansweredRequired(qs, { z: "3031" })).toHaveLength(1);
    expect(unansweredRequired(qs, { z: "30318" })).toHaveLength(0);
  });

  it("requires month and year together", () => {
    const qs = [q({ id: "my", type: "month-year" })];
    expect(unansweredRequired(qs, { my: { month: "3", year: "" } })).toHaveLength(1);
    expect(unansweredRequired(qs, { my: { month: "3", year: "2026" } })).toHaveLength(0);
  });
});

describe("isPageValid", () => {
  it("is true exactly when nothing required is unanswered", () => {
    const qs = [q({ id: "c", type: "consent" })];
    expect(isPageValid(qs, {})).toBe(false);
    expect(isPageValid(qs, { c: true })).toBe(true);
    expect(isPageValid([], {})).toBe(true);
  });
});
