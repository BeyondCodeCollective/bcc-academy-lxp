import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { easternDayKey } from "@/lib/utils";
import { zoomReportConfigured } from "@/lib/zoom-report";
import { syncZoomAttendanceForSession } from "@/lib/attendance/zoom-sync";

// Nightly cron: pull real attendance from Zoom's participant report for every
// live session that met YESTERDAY (ET) and upsert it. This is the source of
// truth that captures joiners the embedded player misses — desktop app, phone,
// raw meeting link. Idempotent, so running it repeatedly (or alongside embed
// auto-attendance) never double-counts.
//
// Yesterday only, on purpose. The cron fires at 04:00 UTC = midnight ET, before
// "today's" session has happened. A numeric Zoom meeting id resolves to the
// LATEST occurrence, so asking for today's session at midnight returned
// yesterday's roster and wrote it into today's slot — every cron-synced course
// carried session N-1's attendance under session N (found 2026-08-18). The
// sync also now refuses a report whose join times don't fall on the unit's
// date, so a cancelled session can't inherit the previous one either.
//
// Auth mirrors the other crons: Vercel Cron sends `Authorization: Bearer
// <CRON_SECRET>`; with no secret set we accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];

type Unit = { week: number; date?: string; label?: string };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  if (!zoomReportConfigured()) {
    // Not an error — the integration simply isn't provisioned yet. Return 200 so
    // the cron dashboard stays green until the Zoom creds are added.
    return NextResponse.json({ ok: true, skipped: "zoom-not-configured" });
  }

  const svc = createServiceClient();
  const now = new Date();
  const yesterdayKey = easternDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const { data: tracks, error } = await svc
    .from("track_overrides")
    .select("track_slug, program_id, week_summaries");
  if (error) {
    console.error("[cron/zoom-attendance] track load failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: Record<string, unknown> = {};
  for (const t of tracks ?? []) {
    const row = t as { track_slug: string; program_id: string | null; week_summaries: Unit[] | null };
    if (!row.program_id || !row.week_summaries) continue;
    const dueUnits = row.week_summaries.filter((u) => u.date === yesterdayKey);
    for (const u of dueUnits) {
      const res = await syncZoomAttendanceForSession(svc, {
        programId: row.program_id,
        trackSlug: row.track_slug,
        weekNumber: u.week,
        unitDate: u.date,
      });
      results[`${row.track_slug}#${u.week}`] = res;
    }
  }

  return NextResponse.json({ ok: true, ran: easternDayKey(now), synced: yesterdayKey, results });
}
