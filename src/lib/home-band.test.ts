import { describe, it, expect } from "vitest";
import {
  trackCode,
  scheduledSessions,
  nextSession,
  weekRail,
  bandSentence,
} from "./home-band";
import type { TrackConfig } from "@/lib/programs/types";

// Minimal fixtures — only the fields the band reads.
function track(over: Partial<TrackConfig> & { slug: string }): TrackConfig {
  return {
    name: over.name ?? "A Course",
    shortName: over.shortName ?? "",
    instructor: "Someone",
    startDate: "2026-09-07",
    totalWeeks: 8,
    sessionTimes: [],
    weekSummaries: over.weekSummaries ?? [],
    weeks: [],
    ...over,
  } as TrackConfig;
}

describe("trackCode", () => {
  it("initials a multi-word name", () => {
    expect(trackCode({ slug: "mw", shortName: "", name: "MASS Wraparound" })).toBe("MW");
  });
  it("keeps a short single word", () => {
    expect(trackCode({ slug: "mass", shortName: "MASS", name: "MASS — Fall" })).toBe("MASS");
  });
  it("never exceeds four characters", () => {
    expect(
      trackCode({ slug: "x", shortName: "", name: "One Two Three Four Five Six" }).length,
    ).toBeLessThanOrEqual(4);
  });
  it("falls back to the slug when there's no name", () => {
    expect(trackCode({ slug: "fde-101", shortName: "", name: "" })).toBe("FDE");
  });
});

describe("scheduledSessions", () => {
  it("skips units with no date rather than guessing one", () => {
    const t = track({
      slug: "t",
      weekSummaries: [
        { week: 1, topic: "a", icon: "", date: "2026-09-08", time: "18:30" },
        { week: 2, topic: "b", icon: "" }, // no date — not scheduled
      ],
    });
    expect(scheduledSessions([t])).toHaveLength(1);
  });

  it("sorts across tracks by real instant", () => {
    const a = track({ slug: "a", name: "Alpha", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2026-09-10", time: "18:30" }] });
    const b = track({ slug: "b", name: "Bravo", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2026-09-08", time: "18:30" }] });
    expect(scheduledSessions([a, b]).map((s) => s.trackSlug)).toEqual(["b", "a"]);
  });

  it("reads 18:30 Eastern as 22:30Z in September (EDT)", () => {
    const t = track({ slug: "t", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2026-09-08", time: "18:30" }] });
    expect(scheduledSessions([t])[0].startsAt).toBe("2026-09-08T22:30:00.000Z");
  });

  it("reads the same wall clock as 23:30Z in January (EST) — the DST case", () => {
    const t = track({ slug: "t", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2027-01-12", time: "18:30" }] });
    expect(scheduledSessions([t])[0].startsAt).toBe("2027-01-12T23:30:00.000Z");
  });
});

describe("nextSession", () => {
  const sessions = scheduledSessions([
    track({ slug: "t", name: "Security+", weekSummaries: [
      { week: 1, topic: "", icon: "", date: "2026-09-08", time: "18:30", durationMinutes: 90 },
      { week: 2, topic: "", icon: "", date: "2026-09-15", time: "18:30", durationMinutes: 90 },
    ] }),
  ]);

  it("counts a session as live until its duration is up", () => {
    // 19:00 ET on the 8th — half an hour in.
    const r = nextSession(sessions, new Date("2026-09-08T23:00:00Z"));
    expect(r?.live).toBe(true);
  });

  it("moves on once the session has ended", () => {
    // 20:15 ET — fifteen minutes after a 90-minute session ends.
    const r = nextSession(sessions, new Date("2026-09-09T00:15:00Z"));
    expect(r?.session.startsAt).toBe("2026-09-15T22:30:00.000Z");
  });

  it("returns null when everything is behind us", () => {
    expect(nextSession(sessions, new Date("2026-10-01T00:00:00Z"))).toBeNull();
  });
});

describe("weekRail", () => {
  const sessions = scheduledSessions([
    track({ slug: "t", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2026-09-10", time: "18:30" }] }),
  ]);

  it("anchors on Monday and runs seven days", () => {
    const rail = weekRail(sessions, new Date("2026-09-09T16:00:00Z")); // Wed
    expect(rail).toHaveLength(7);
    expect(rail[0].short).toBe("Mon");
    expect(rail[0].dayOfMonth).toBe("7");
  });

  it("marks today", () => {
    const rail = weekRail(sessions, new Date("2026-09-09T16:00:00Z"));
    expect(rail.filter((d) => d.isToday).map((d) => d.short)).toEqual(["Wed"]);
  });

  it("files a session on its Eastern day, not its UTC day", () => {
    // 18:30 ET on the 10th is 22:30Z the 10th — same day. But a 9pm ET
    // session would be 01:00Z the NEXT day, and must still land on Thursday.
    const late = scheduledSessions([
      track({ slug: "t", weekSummaries: [{ week: 1, topic: "", icon: "", date: "2026-09-10", time: "21:00" }] }),
    ]);
    const rail = weekRail(late, new Date("2026-09-09T16:00:00Z"));
    expect(rail.find((d) => d.short === "Thu")?.sessions).toHaveLength(1);
    expect(rail.find((d) => d.short === "Fri")?.sessions).toHaveLength(0);
  });
});

describe("bandSentence", () => {
  const sessions = scheduledSessions([
    track({ slug: "t", name: "CompTIA Security+", shortName: "Security+", weekSummaries: [
      { week: 13, topic: "", icon: "", date: "2026-09-08", time: "18:30", durationMinutes: 90 },
    ] }),
  ]);

  it("says nothing scheduled when there is nothing", () => {
    expect(bandSentence(null, new Date("2026-09-07T12:00:00Z")).headline)
      .toBe("Nothing scheduled.");
  });

  it("calls tomorrow tomorrow", () => {
    const now = new Date("2026-09-07T16:00:00Z"); // Mon
    expect(bandSentence(nextSession(sessions, now), now).headline)
      .toContain("tomorrow");
  });

  it("names the weekday further out", () => {
    const far = scheduledSessions([
      track({ slug: "t", shortName: "Security+", weekSummaries: [
        { week: 1, topic: "", icon: "", date: "2026-09-10", time: "18:30" },
      ] }),
    ]);
    const now = new Date("2026-09-07T16:00:00Z");
    expect(bandSentence(nextSession(far, now), now).headline)
      .toBe("You're free until Thursday.");
  });

  it("says it's live during the session", () => {
    const now = new Date("2026-09-08T23:00:00Z");
    expect(bandSentence(nextSession(sessions, now), now).headline)
      .toBe("Security+ is live now.");
  });
});
