import { test, expect } from "@playwright/test";
import { admin } from "./helpers/supabase";
import { getHomeProgramForTrack } from "../../src/lib/programs";

/**
 * Guards against the "moving a track between programs orphans its data" bug.
 *
 * Program-scoped tables (session_content, track_overrides, student_tracks) tag
 * each row with a program_id. When a track changes programs, those rows must
 * move with it — otherwise the Zoom link / overrides / enrollments live under
 * the OLD program and the learner (now resolving the NEW program) can't see
 * them. This test fails if any row's program_id doesn't match the track's
 * current home program (per the TS config).
 *
 * Requires SMOKE_SUPABASE_URL + SMOKE_SUPABASE_SERVICE_ROLE_KEY.
 */
test("program-scoped data lives under each track's home program", async () => {
  const svc = admin();

  const { data: programs, error: progErr } = await svc.from("programs").select("id, slug");
  expect(progErr, progErr?.message).toBeNull();
  const idToSlug = new Map((programs ?? []).map((p) => [p.id as string, p.slug as string]));

  const tables: Array<{ table: string; trackCol: string }> = [
    { table: "session_content", trackCol: "track" },
    { table: "track_overrides", trackCol: "track_slug" },
    { table: "student_tracks", trackCol: "track_slug" },
  ];

  const orphans = new Set<string>();

  for (const { table, trackCol } of tables) {
    const { data, error } = await svc.from(table).select(`${trackCol}, program_id`);
    expect(error, `${table}: ${error?.message}`).toBeNull();

    for (const row of (data ?? []) as Record<string, string | null>[]) {
      const track = row[trackCol];
      const programId = row.program_id;
      if (!track || !programId) continue;

      const home = getHomeProgramForTrack(track);
      // Tracks not in any TS config (DB-only / legacy) aren't config-managed.
      if (!home) continue;

      const under = idToSlug.get(programId) ?? programId;
      if (under !== home.slug) {
        orphans.add(`${table}: "${track}" is under "${under}" but its home is "${home.slug}"`);
      }
    }
  }

  expect(
    [...orphans],
    `Orphaned program-scoped data found (a track's rows under the wrong program):\n  ${[...orphans].join("\n  ")}`,
  ).toEqual([]);
});
