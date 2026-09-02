import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runTrackAutomation } from "@/lib/automation/engine";

// Daily course-automation pass (see src/lib/automation/engine.ts): issues
// auto-certificates for learners who met a track's completion rule, and sends
// engagement nudges (never-started / stalled), once per rule per learner.
// Scheduled 13:00 UTC so nudges land in learners' mornings (9am ET), not 3am.
//
// Auth mirrors the other crons: Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` when the env var is set; with no
// secret we accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const svc = createServiceClient();
  const result = await runTrackAutomation(svc);
  console.log(
    `[automation] tracks=${result.tracks} certs=${result.certificatesIssued.length} nudges=${result.nudgesSent.length} errors=${result.errors.length}`,
  );
  if (result.errors.length) console.error("[automation] errors:", result.errors);

  return NextResponse.json({
    tracks: result.tracks,
    certificatesIssued: result.certificatesIssued.length,
    nudgesSent: result.nudgesSent.length,
    errors: result.errors,
  });
}
