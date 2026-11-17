import { describe, expect, it } from "vitest";
import { dedupeParticipants } from "@/lib/zoom-report";
import { diffClass } from "./zoom-attendance";

const p = (name: string, email: string | null = null, joinTime = "2026-11-12T16:00:00Z", durationSeconds = 60) => ({
  name,
  email,
  joinTime,
  durationSeconds,
});
const s = (id: string, first: string, last: string, email: string | null = null) => ({
  id,
  email,
  first_name: first,
  last_name: last,
});

describe("dedupeParticipants", () => {
  it("collapses one person across restarted instances, keeping earliest join and summing time", () => {
    const out = dedupeParticipants([
      p("Ada Lovelace", null, "2026-11-12T17:00:00Z", 100),
      p("ada lovelace", null, "2026-11-12T16:00:00Z", 50),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ joinTime: "2026-11-12T16:00:00Z", durationSeconds: 150 });
  });
});

describe("diffClass", () => {
  const base = {
    label: "Field Ready week 1",
    keyPrefix: "k",
    roster: [s("1", "Ada", "Lovelace"), s("2", "Grace", "Hopper"), s("3", "Alan", "Turing")],
    staffNames: new Set(["katherine johnson"]),
    staffEmails: new Set(["programs@wearebcc.org"]),
  };

  it("lists in-Zoom-but-unrecorded, unknown names and recorded-but-absent, skipping host and instructors", () => {
    const rows = diffClass({
      ...base,
      participants: [
        p("Ada Lovelace (she/her)"),
        p("Grace Hopper"),
        p("Katherine Johnson"),
        p("BCC Programs", "programs@wearebcc.org"),
        p("iPhone"),
      ],
      attendedIds: new Set(["1", "3"]),
    });
    expect(rows.map((r) => r.key)).toEqual(["k|zoom-only|2", "k|unknown|iphone", "k|recorded-only|3"]);
    expect(rows[0].label).toContain("Grace Hopper was in Zoom but has no attendance");
    expect(rows[2].label).toContain("Alan Turing is marked present but not in Zoom");
  });

  it("is empty when Zoom and attendance agree", () => {
    expect(
      diffClass({ ...base, participants: [p("Ada Lovelace")], attendedIds: new Set(["1"]) }),
    ).toEqual([]);
  });
});
