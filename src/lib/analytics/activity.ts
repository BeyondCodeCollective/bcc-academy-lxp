// The platform's liveness signal: did a learner *do the work*? It's the union
// of attendance + submissions + reflections, and it's the one place that
// reconciles the schema quirk where attendance names its columns
// `track`/`checked_in_at` while submissions and reflections use
// `track_slug`/`submitted_at`.
//
// Wrapped in React's `cache` so the per-request analytics fetchers (progress,
// acquisition) that all need this union share a single fetch — the page resolves
// one ProgramScope and hands the same reference to each, so this runs once.

import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import type { ProgramScope } from "@/lib/programs/scope";

export type ActivityRow = {
  student_id: string;
  /** Track slug, normalized across the three source tables. */
  slug: string;
  /** Week the activity belongs to, when the source records one. */
  week: number | null;
  /** When it happened (checked_in_at / submitted_at), or null if unrecorded. */
  at: string | null;
};

export const getLearnerActivity = cache(
  async (scope: ProgramScope): Promise<ActivityRow[]> => {
    const svc = createServiceClient();
    const ids = scope.ids;

    const [attRes, subRes, reflRes] = await Promise.all([
      svc.from("attendance").select("student_id, track, week_number, checked_in_at").in("program_id", ids),
      svc.from("submissions").select("student_id, track_slug, week_number, submitted_at").in("program_id", ids),
      svc.from("reflections").select("student_id, track_slug, week_number, submitted_at").in("program_id", ids),
    ]);

    const att = (attRes.data ?? []) as {
      student_id: string;
      track: string;
      week_number: number | null;
      checked_in_at: string | null;
    }[];
    const sub = (subRes.data ?? []) as {
      student_id: string;
      track_slug: string;
      week_number: number | null;
      submitted_at: string | null;
    }[];
    const refl = (reflRes.data ?? []) as {
      student_id: string;
      track_slug: string;
      week_number: number | null;
      submitted_at: string | null;
    }[];

    return [
      ...att.map((r) => ({
        student_id: r.student_id,
        slug: r.track,
        week: r.week_number,
        at: r.checked_in_at,
      })),
      ...sub.map((r) => ({
        student_id: r.student_id,
        slug: r.track_slug,
        week: r.week_number,
        at: r.submitted_at,
      })),
      ...refl.map((r) => ({
        student_id: r.student_id,
        slug: r.track_slug,
        week: r.week_number,
        at: r.submitted_at,
      })),
    ];
  },
);
