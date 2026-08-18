import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Daily cron (Vercel) that records one active-user snapshot per program into
// `analytics_daily_snapshots`. The platform only stores each learner's LAST
// sign-in, so daily-active history could never be reconstructed after the fact
// — this starts accumulating it from today forward. Idempotent per day: re-runs
// upsert the same (snapshot_date, program_id) row.
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

  // Pull the raw rows once and aggregate in-process — trivial at this scale and
  // avoids needing a Postgres RPC for the filtered counts.
  const [{ data: students, error: sErr }, { data: progress, error: pErr }] =
    await Promise.all([
      svc.from("students").select("program_id, last_activity_at"),
      svc.from("week_progress").select("program_id"),
    ]);
  if (sErr || pErr) {
    console.error("[cron/daily-snapshot] fetch failed", sErr ?? pErr);
    return NextResponse.json({ ok: false, error: (sErr ?? pErr)?.message }, { status: 500 });
  }

  type Agg = { total: number; active1d: number; active7d: number; views: number };
  const byProgram = new Map<string, Agg>();
  const get = (pid: string): Agg => {
    let a = byProgram.get(pid);
    if (!a) { a = { total: 0, active1d: 0, active7d: 0, views: 0 }; byProgram.set(pid, a); }
    return a;
  };

  for (const s of students ?? []) {
    if (!s.program_id) continue;
    const a = get(s.program_id as string);
    a.total++;
    // Behavior, not login: last_seen_at is a signup/login stamp.
    const act = s.last_activity_at as string | null;
    if (act) {
      if (act >= oneDayAgo) a.active1d++;
      if (act >= sevenDaysAgo) a.active7d++;
    }
  }
  for (const p of progress ?? []) {
    if (!p.program_id) continue;
    get(p.program_id as string).views++;
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
