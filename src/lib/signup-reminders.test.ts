import { describe, expect, it } from "vitest";
import { dueReminder } from "./signup-reminders";

const H = 3_600_000;
const start = Date.UTC(2026, 10, 19, 23, 0);
const none = new Set<string>();

describe("dueReminder", () => {
  it("sends nothing before the one-week mark", () => {
    expect(dueReminder(start, start - 300 * H, start - 169 * H, none)).toBeNull();
  });
  it("sends the one-week reminder inside its window", () => {
    expect(dueReminder(start, start - 300 * H, start - 100 * H, none)).toBe("1w");
  });
  it("sends the 3-day reminder between one week and 24h", () => {
    expect(dueReminder(start, start - 300 * H, start - 60 * H, none)).toBe("3d");
  });
  it("sends 24h then 1h as the session nears", () => {
    expect(dueReminder(start, start - 300 * H, start - 20 * H, none)).toBe("24h");
    expect(dueReminder(start, start - 300 * H, start - 0.5 * H, none)).toBe("1h");
  });
  it("never repeats a sent touch", () => {
    expect(dueReminder(start, start - 300 * H, start - 100 * H, new Set(["1w"]))).toBeNull();
    expect(dueReminder(start, start - 300 * H, start - 60 * H, new Set(["3d"]))).toBeNull();
  });
  it("skips touches that passed before the person signed up", () => {
    // Signed up 2 days out: no one-week email, first touch is 24h.
    expect(dueReminder(start, start - 48 * H, start - 40 * H, none)).toBeNull();
    expect(dueReminder(start, start - 48 * H, start - 20 * H, none)).toBe("24h");
  });
  it("sends nothing once the session has started", () => {
    expect(dueReminder(start, start - 300 * H, start + H, none)).toBeNull();
  });
});
