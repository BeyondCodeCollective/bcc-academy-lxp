import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEveryProgramConfig } from "@/lib/programs";
import { isLearner } from "@/lib/analytics/engagement";

// Daily cron (Vercel) that records one learner snapshot per program into
// `analytics_daily_snapshots`: learners, active (behavior) in 1d/7d, videos
// watched. The platform only stores each learner's LAST activity, so daily
// history could never be reconstructed after the fact — this accumulates it
// from today forward with the same definitions the dashboards use.
// Idempotent per day: re-runs upsert the same (snapshot_date, program_id) row.
// Follow-up (needs a migration): add engaged / finished / certificates columns.
//
// Auth mirrors /api/warm: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
// when the env var is set; with no secret we accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const svc = createServiceClient();
  const now = Date.now();
  const snapshotDate = new Date(now).toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const oneDayAgo = new Date(now - DAY_MS).toISOString();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();

  // Canonical numbers, or the history is worthless. Before: total_accounts
  // counted admins/staff/tests, active_* was login recency, video_views_total
  // counted every week_progress row including unwatched. And membership was
  // students.program_id, which apex signups stamp as Catalyst. Nothing read
  // the table; now it can be trusted (analytics audit 2026-08-18, F10).
  //  - membership: enrolled in one of the program's track slugs, learners only
  //  - active_1d/7d: last_activity_at (behavior), not last_seen_at (login)
  //  - video_views_total: rows with video_watched_at set
  const [{ data: programs, error: prErr }, { data: overrides, error: ovErr }] = await Promise.all([
    svc.from("programs").select("id, slug"),
    svc.from("track_overrides").select("program_id, track_slug"),
  ]);
  if (prErr || ovErr) {
    console.error("[cron/daily-snapshot] program load failed", prErr ?? ovErr);
    return NextResponse.json({ ok: false, error: (prErr ?? ovErr)?.message }, { status: 500 });
  }
  // program_id → its track slugs (TS-config tracks + builder courses).
  const slugsByProgram = new Map<string, Set<string>>();
  for (const p of getEveryProgramConfig()) {
    const row = (programs ?? []).find((r) => r.slug === p.slug);
    if (!row) continue;
    slugsByProgram.set(row.id as string, new Set(p.tracks.map((t) => t.slug)));
  }
  for (const o of overrides ?? []) {
    if (!o.program_id) continue;
    let set = slugsByProgram.get(o.program_id as string);
    if (!set) { set = new Set(); slugsByProgram.set(o.program_id as string, set); }
    set.add(o.track_slug as string);
  }

  const [{ data: enroll, error: eErr }, { data: students, error: sErr }, { data: progress, error: pErr }] =
    await Promise.all([
      svc.from("student_tracks").select("student_id, track_slug"),
      svc.from("students").select("id, role, is_test, is_staff, last_activity_at"),
      svc.from("week_progress").select("user_id, track_slug").not("video_watched_at", "is", null),
    ]);
  if (eErr || sErr || pErr) {
    console.error("[cron/daily-snapshot] fetch failed", eErr ?? sErr ?? pErr);
    return NextResponse.json({ ok: false, error: (eErr ?? sErr ?? pErr)?.message }, { status: 500 });
  }
  const learnerById = new Map<string, { last_activity_at: string | null }>();
  for (const st of students ?? []) if (isLearner(st)) learnerById.set(st.id as string, { last_activity_at: st.last_activity_at as string | null });

  type Agg = { total: number; active1d: number; active7d: number; views: number };
  const byProgram = new Map<string, Agg>();
  for (const [programId, slugs] of slugsByProgram) {
    const members = new Set<string>();
    for (const e of enroll ?? []) if (slugs.has(e.track_slug as string) && learnerById.has(e.student_id as string)) members.add(e.student_id as string);
    let active1d = 0, active7d = 0;
    for (const id of members) {
      const act = learnerById.get(id)?.last_activity_at;
      if (act) { if (act >= oneDayAgo) active1d++; if (act >= sevenDaysAgo) active7d++; }
    }
    let views = 0;
    for (const w of progress ?? []) if (slugs.has(w.track_slug as string) && members.has(w.user_id as string)) views++;
    byProgram.set(programId, { total: members.size, active1d, active7d, views });
  }

  const rows = Array.from(byProgram.entries()).map(([program_id, a]) => ({
    snapshot_date: snapshotDate,
    program_id,
    total_accounts: a.total,
    active_1d: a.active1d,
    active_7d: a.active7d,
    video_views_total: a.views,
  }));

  if (rows.length > 0) {
    const { error: upErr } = await svc
      .from("analytics_daily_snapshots")
      .upsert(rows, { onConflict: "snapshot_date,program_id" });
    if (upErr) {
      console.error("[cron/daily-snapshot] upsert failed", upErr);
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, snapshotDate, programs: rows.length });
}
