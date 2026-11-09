import { describe, expect, it } from "vitest";
import { likertLegend, likertPoint } from "./likert-scale";

const FIELD_READY = { low: "1: Strongly disagree", high: "5: Strongly agree" };
// Older schemas separate the number with a long dash (U+2014).
const DASHED = { low: "1 — Strongly Disagree", high: "5 — Strongly Agree" };
const LEGACY = { low: "Strongly Agree", high: "Strongly Disagree" };
const CONFIDENCE = { low: "1 — Not at all confident", high: "5 — Very confident" };

describe("likertLegend", () => {
  it("reads the question's own anchors", () => {
    expect(likertLegend(FIELD_READY)).toBe("Scale 1 = Strongly disagree to 5 = Strongly agree");
    expect(likertLegend(DASHED)).toBe("Scale 1 = Strongly Disagree to 5 = Strongly Agree");
    expect(likertLegend(CONFIDENCE)).toBe("Scale 1 = Not at all confident to 5 = Very confident");
  });

  it("falls back to a plain range without anchors", () => {
    expect(likertLegend(undefined)).toBe("Scale 1 to 5");
  });
});

describe("likertPoint", () => {
  it("keeps numeric answers as the point clicked", () => {
    expect(likertPoint("5", FIELD_READY)).toBe(5);
    expect(likertPoint("1", LEGACY)).toBe(1);
  });

  it("puts Strongly agree at 5 on current scales", () => {
    expect(likertPoint("Strongly Agree", FIELD_READY)).toBe(5);
    expect(likertPoint("strongly disagree", DASHED)).toBe(1);
    expect(likertPoint("Neither agree nor disagree", FIELD_READY)).toBe(3);
  });

  it("puts Strongly agree at 1 on old inverted scales", () => {
    expect(likertPoint("Strongly Agree", LEGACY)).toBe(1);
    expect(likertPoint("Disagree", LEGACY)).toBe(4);
  });

  it("returns NaN for anything else", () => {
    expect(likertPoint("Prefer not to say", FIELD_READY)).toBeNaN();
    expect(likertPoint("", FIELD_READY)).toBeNaN();
  });
});
