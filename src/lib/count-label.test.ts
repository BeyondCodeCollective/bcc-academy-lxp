import { describe, it, expect } from "vitest";
import { countLabel } from "@/lib/count-label";

describe("countLabel", () => {
  it("does not pluralize one", () => {
    expect(countLabel(1, "session")).toBe("1 session");
    expect(countLabel(1, "week")).toBe("1 week");
  });

  it("pluralizes everything else, including zero", () => {
    expect(countLabel(0, "session")).toBe("0 sessions");
    expect(countLabel(2, "week")).toBe("2 weeks");
    expect(countLabel(21, "session")).toBe("21 sessions");
  });
});
