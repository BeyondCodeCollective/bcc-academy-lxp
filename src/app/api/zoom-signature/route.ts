"use server";

import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { getLearnerAccess } from "@/lib/auth/active-enrollment";
import { isStaffEmail } from "@/lib/auth/admins";
import { logActivityEvent } from "@/lib/analytics/log-event";

/**
 * POST /api/zoom-signature
 *
 * Generates a Zoom Meeting SDK JWT signature server-side so the SDK Key and
 * Secret never touch the browser. Requires an authenticated LXP session —
 * unauthenticated requests are rejected before any Zoom credential is used.
 *
 * Body: { meetingNumber: string }
 * Returns: { signature: string; sdkKey: string }
 */
export async function POST(request: NextRequest) {
  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Confirm the user has a student record (not just an auth user)
  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pending registrants (enrolled only in a not-yet-started course) can't join
  // meetings yet — mirror the tutor + dashboard confinement. Staff exempt.
  const program = await getProgram();
  const access = await getLearnerAccess(svc, user.id, program);
  if (access.pendingOnly && !isStaffEmail(user.email)) {
    return NextResponse.json(
      { error: "Your course hasn't started yet." },
      { status: 403 },
    );
  }

  // ── Zoom credentials check ────────────────────────────────────────────────
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    console.error("[zoom-signature] ZOOM_SDK_KEY or ZOOM_SDK_SECRET not set");
    return NextResponse.json(
      { error: "Zoom not configured" },
      { status: 503 }
    );
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let meetingNumber: string;
  let trackSlug = "";
  let weekNumber = 0;
  let sessionNumber = 1;
  try {
    const body = await request.json();
    meetingNumber = String(body.meetingNumber ?? "").replace(/\D/g, "");
    if (!meetingNumber) throw new Error("missing meetingNumber");
    // Optional attendance context — used to auto-record presence below.
    const rawTrack = String(body.trackSlug ?? "");
    if (/^[a-z0-9-]{1,64}$/.test(rawTrack)) trackSlug = rawTrack;
    weekNumber = Number.parseInt(String(body.weekNumber ?? ""), 10) || 0;
    sessionNumber = Number.parseInt(String(body.sessionNumber ?? ""), 10) || 1;
  } catch {
    return NextResponse.json(
      { error: "meetingNumber required" },
      { status: 400 }
    );
  }

  // ── Auto-attendance ───────────────────────────────────────────────────────
  // A real, enrolled learner joining the live session marks their own presence.
  // Best-effort and non-blocking: never fail or delay the join if this write
  // errors. Staff (instructors/admins) are skipped so they don't pollute the
  // learner attendance count. Idempotent per (student, track, week, session).
  if (trackSlug && weekNumber && !isStaffEmail(user.email)) {
    // Runs AFTER the response so the Zoom join is never delayed — but via
    // after(), which the platform guarantees to complete. The previous
    // `void (async () => …)()` fire-and-forget was frozen with the lambda the
    // moment the signature was returned: every join at the Security+ kickoff
    // (2026-07-13, ~50 joins) recorded NO attendance and NO session_join
    // event. Same failure class as PR #681 — never `void` a Supabase write
    // in a serverless function.
    // Resolve the program the student is enrolled under for this track (this
    // also confirms enrollment), then upsert against the real 5-column unique
    // key: `program_id` is NOT NULL and the conflict target must match.
    after(async () => {
      const { data: enrollment } = await svc
        .from("student_tracks")
        .select("program_id")
        .eq("student_id", user.id)
        .eq("track_slug", trackSlug)
        .maybeSingle<{ program_id: string }>();
      if (!enrollment?.program_id) return;
      const { error } = await svc.from("attendance").upsert(
        {
          program_id: enrollment.program_id,
          student_id: user.id,
          track: trackSlug,
          week_number: weekNumber,
          session_number: sessionNumber,
          marked_by: user.id,
        },
        {
          onConflict: "program_id,student_id,track,week_number,session_number",
          ignoreDuplicates: true,
        },
      );
      if (error) console.error("[zoom-signature] auto-attendance failed:", error.message);
      // The join is also a timeline event — attendance is the credential
      // record; this feeds the engagement heatmap and "active" signals.
      await logActivityEvent({
        userId: user.id,
        eventType: "session_join",
        programId: enrollment.program_id,
        trackSlug,
        metadata: { week: weekNumber, session: sessionNumber },
      });
    });
  }

  // ── Generate JWT signature ────────────────────────────────────────────────
  // Role 0 = attendee (students never join as host)
  const role = 0;
  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // valid for 2 hours

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      sdkKey,
      appKey: sdkKey,
      mn: meetingNumber,
      role,
      iat,
      exp,
      tokenExp: exp,
      // WebRTC video mode — enables multi-video (gallery/speaker view)
      // without SharedArrayBuffer, which needs cross-origin isolation we
      // can't enable inside the dashboard iframe
      video_webrtc_mode: 1,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", sdkSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return NextResponse.json({
    signature: `${header}.${payload}.${signature}`,
    sdkKey,
  });
}
