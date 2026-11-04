import { describe, expect, it } from "vitest";
import type { TrackConfig } from "@/lib/programs/types";
import { isDateGated, isSequentialGated } from "./track-gating";

const track = (t: Partial<TrackConfig>) => t as TrackConfig;

describe("week gating switch", () => {
  it("gates a cohort track by date when the switch is on", () => {
    expect(isDateGated(track({ sequentialGating: true }))).toBe(true);
    expect(isSequentialGated(track({ sequentialGating: true }))).toBe(false);
  });

  it("gates a self-paced track by progress, never by date", () => {
    const t = track({ selfPaced: true, sequentialGating: true });
    expect(isSequentialGated(t)).toBe(true);
    expect(isDateGated(t)).toBe(false);
  });

  it("does nothing when the switch is off", () => {
    expect(isDateGated(track({}))).toBe(false);
    expect(isSequentialGated(track({ selfPaced: true }))).toBe(false);
  });
});
