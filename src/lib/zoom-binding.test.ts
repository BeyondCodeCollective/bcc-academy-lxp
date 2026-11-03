import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMeetingBoundToLearnerTrack } from "./zoom-binding";

type Row = Record<string, unknown>;

// Minimal chainable stub: each table resolves to fixed rows; eq() is recorded.
function fakeSvc(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const q = {
        select: () => q,
        eq: () => q,
        returns: () => q,
        maybeSingle: async () => ({ data: rows[0] ?? null }),
        then: (res: (v: { data: Row[] }) => unknown) => res({ data: rows }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const content = [
  {
    meeting_link: "https://us02web.zoom.us/j/81234567890?pwd=abc",
    meeting_link_2: "https://zoom.us/j/89999999999",
    meeting_link_3: null,
  },
];

describe("isMeetingBoundToLearnerTrack", () => {
  it("allows a meeting configured on the enrolled track (any session slot)", async () => {
    const svc = fakeSvc({ student_tracks: [{ program_id: "p1" }], session_content: content });
    expect(await isMeetingBoundToLearnerTrack(svc, "s", "t", "81234567890")).toBe(true);
    expect(await isMeetingBoundToLearnerTrack(svc, "s", "t", "89999999999")).toBe(true);
  });

  it("refuses a meeting number not configured for the track", async () => {
    const svc = fakeSvc({ student_tracks: [{ program_id: "p1" }], session_content: content });
    expect(await isMeetingBoundToLearnerTrack(svc, "s", "t", "85555555555")).toBe(false);
  });

  it("refuses an unenrolled learner even if the meeting exists", async () => {
    const svc = fakeSvc({ student_tracks: [], session_content: content });
    expect(await isMeetingBoundToLearnerTrack(svc, "s", "t", "81234567890")).toBe(false);
  });

  it("refuses when no track is supplied", async () => {
    const svc = fakeSvc({ student_tracks: [{ program_id: "p1" }], session_content: content });
    expect(await isMeetingBoundToLearnerTrack(svc, "s", "", "81234567890")).toBe(false);
  });
});
