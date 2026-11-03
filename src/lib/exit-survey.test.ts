import { describe, expect, it } from "vitest";
import { asksHours, cleanText, parseUnderstanding } from "./exit-survey";

describe("asksHours", () => {
  it("asks only on the first session of a week after week 1", () => {
    expect(asksHours(1, 1)).toBe(false);
    expect(asksHours(2, 1)).toBe(true);
    expect(asksHours(2, 2)).toBe(false);
    expect(asksHours(5, 1)).toBe(true);
  });
});

describe("parseUnderstanding", () => {
  it("accepts whole numbers 1 to 5", () => {
    expect([1, 2, 3, 4, 5].map(parseUnderstanding)).toEqual([1, 2, 3, 4, 5]);
    expect(parseUnderstanding("4")).toBe(4);
  });
  it("rejects everything else", () => {
    for (const v of [0, 6, 2.5, "", "x", null, undefined, NaN]) {
      expect(parseUnderstanding(v)).toBeNull();
    }
  });
});

describe("cleanText", () => {
  it("trims and returns text", () => {
    expect(cleanText("  too fast  ", 20)).toBe("too fast");
  });
  it("returns null for blank, non-string, or over the limit", () => {
    expect(cleanText("   ", 20)).toBeNull();
    expect(cleanText(5, 20)).toBeNull();
    expect(cleanText("x".repeat(21), 20)).toBeNull();
  });
});
