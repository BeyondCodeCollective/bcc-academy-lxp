"use server";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { getLearnerAccess } from "@/lib/auth/active-enrollment";
import { isStaffEmail } from "@/lib/auth/admins";

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
  try {
    const body = await request.json();
    meetingNumber = String(body.meetingNumber ?? "").replace(/\D/g, "");
    if (!meetingNumber) throw new Error("missing meetingNumber");
  } catch {
    return NextResponse.json(
      { error: "meetingNumber required" },
      { status: 400 }
    );
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
