import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { driveConfigured, uploadRecordingToDrive } from "@/lib/google-drive";
import {
  listRecordings,
  zoomToken,
  zoomRecordingsConfigured,
  easternDate,
  meetingIdFromLink,
  type ZoomRecording,
} from "@/lib/zoom-recordings";

// Pulls each class recording off Zoom and onto the platform, so students can
// rewatch inside the portal and nobody has to download and re-upload anything.
//
// Why not just link to Zoom: a Zoom share page can demand a passcode or host
// approval, and cloud recordings are deleted when the account's retention
// window expires. Neither is survivable for a course students revisit for
// months.
//
// Shape of the job, and why:
//
//   · ONE recording per invocation. A class recording is 200 MB to 1 GB and has
//     to be streamed Zoom → here → storage. Doing the whole backlog in one run
//     would blow the function's time budget halfway through a file and leave
//     nothing to show for it. One per run is always finishable, and the cron
//     runs often enough to drain a backlog on its own.
//   · Idempotent via `session_content.recording_url`. A week that already has a
//     recording is skipped, so a re-run can't duplicate work and a crashed run
//     just gets retried on the next tick.
//   · Streamed, never buffered. A 1 GB Buffer in a serverless function is an
//     out-of-memory crash; the body is piped straight through.
//
// Auth mirrors the other crons: Vercel Cron sends `Authorization: Bearer
// <CRON_SECRET>`; with no secret set we accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];
// Big files need room. vercel.json's global 120s cap is fine for page renders
// and far too short to move a gigabyte.
export const maxDuration = 800;

const BUCKET = "session-recordings";
/** Skip Zoom's empty artefacts — a "recording" of a meeting nobody spoke in. */
const MIN_MINUTES = 5;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  if (!zoomRecordingsConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "Zoom API not configured (ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET)",
    });
  }

  const svc = createServiceClient();

  // Meeting id → course, derived from the meeting links already stored against
  // each week. Nothing is hardcoded: adding a course in the admin is enough for
  // its recordings to start importing.
  const { data: sessionRows } = await svc
    .from("session_content")
    .select("id, track, week_number, meeting_link, recording_url");

  const trackByMeetingId = new Map<string, string>();
  for (const row of sessionRows ?? []) {
    const id = meetingIdFromLink(row.meeting_link);
    if (id) trackByMeetingId.set(id, row.track);
  }
  if (trackByMeetingId.size === 0) {
    return NextResponse.json({ ok: true, imported: 0, note: "no Zoom meeting links stored" });
  }

  // The week a class was held, from real check-ins — the schedule can't say
  // whether a session actually ran, and attendance can.
  const { data: attendance } = await svc
    .from("attendance")
    .select("track, week_number, checked_in_at")
    .not("checked_in_at", "is", null);
  const weekByTrackDate = new Map<string, number>();
  for (const a of attendance ?? []) {
    weekByTrackDate.set(`${a.track}|${easternDate(a.checked_in_at)}`, a.week_number);
  }

  // 45 days back covers a missed cron, a holiday gap, and Zoom's shortest
  // retention window without re-listing the whole account every run.
  const to = new Date();
  const from = new Date(to.getTime() - 45 * 24 * 60 * 60 * 1000);
  const recordings = await listRecordings(from.toISOString(), to.toISOString());

  const pending: { rec: ZoomRecording; rowId: string; track: string; week: number }[] = [];
  for (const rec of recordings) {
    if (rec.durationMinutes < MIN_MINUTES) continue;
    const track = trackByMeetingId.get(rec.meetingId);
    if (!track) continue;
    const week = weekByTrackDate.get(`${track}|${easternDate(rec.startTime)}`);
    if (!week) continue;
    const row = (sessionRows ?? []).find(
      (r) => r.track === track && r.week_number === week,
    );
    if (!row || row.recording_url) continue; // already imported
    pending.push({ rec, rowId: row.id, track, week });
  }

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, imported: 0, remaining: 0 });
  }

  // Oldest first, so a backlog drains in the order students would watch it.
  pending.sort((a, b) => a.rec.startTime.localeCompare(b.rec.startTime));
  const job = pending[0];

  const token = await zoomToken();
  if (!token) return NextResponse.json({ ok: false, error: "no Zoom token" }, { status: 500 });

  try {
    const res = await fetch(job.rec.downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok || !res.body) {
      throw new Error(`Zoom download ${res.status}`);
    }

    // Google Drive when it's configured, Supabase otherwise.
    //
    // Drive is the default because Supabase enforces a project-wide upload cap
    // (50 MB here) and these files are 200 MB to 1 GB, while Workspace storage
    // is already paid for and RecordingCard has embedded Drive links for years.
    // Supabase stays as the fallback: it's private with signed URLs, which is
    // the stronger access model whenever the file is small enough to fit.
    let storedValue: string;
    let destination: string;

    if (driveConfigured()) {
      const up = await uploadRecordingToDrive({
        name: `${job.track} — week ${job.week} (${easternDate(job.rec.startTime)}).mp4`,
        body: res.body,
        bytes: job.rec.bytes || undefined,
      });
      if (!up.ok) throw new Error(up.error);
      storedValue = up.url; // /file/d/<id>/view — toDriveEmbedUrl handles it
      destination = "google-drive";
    } else {
      const path = `${job.track}/week-${job.week}-${job.rec.uuid.replace(/[^a-zA-Z0-9]/g, "")}.mp4`;
      const { error: upErr } = await svc.storage.from(BUCKET).upload(path, res.body, {
        contentType: "video/mp4",
        upsert: true,
        duplex: "half",
      } as never);
      if (upErr) throw new Error(`storage upload: ${upErr.message}`);
      // The stored PATH, not a URL: the bucket is private and the week page
      // mints a signed URL per request. A URL written here would expire in the
      // database.
      storedValue = `${BUCKET}:${path}`;
      destination = "supabase";
    }

    const { error: dbErr } = await svc
      .from("session_content")
      .update({ recording_url: storedValue })
      .eq("id", job.rowId);
    if (dbErr) throw new Error(`db update: ${dbErr.message}`);

    return NextResponse.json({
      ok: true,
      imported: 1,
      destination,
      track: job.track,
      week: job.week,
      heldOn: easternDate(job.rec.startTime),
      megabytes: Math.round(job.rec.bytes / 1048576),
      remaining: pending.length - 1,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[zoom-recordings] import failed", {
      track: job.track,
      week: job.week,
      message,
    });
    // Nothing is written on failure, so the next run retries this same file.
    return NextResponse.json(
      { ok: false, track: job.track, week: job.week, error: message },
      { status: 500 },
    );
  }
}
