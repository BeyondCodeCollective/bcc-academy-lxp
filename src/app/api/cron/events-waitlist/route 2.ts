import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { promoteWaitlist } from "@/lib/events-waitlist";

export const dynamic = "force-dynamic";

// Hourly: expire seat offers past their window and re-offer those seats to
// the next waitlisted attendees. Cancels already do this inline; the cron
// covers offers that lapse with no cancel to trigger a pass.
// Auth mirrors the other crons: `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const svc = createServiceClient();
  const { data: stale } = await svc
    .from("event_attendees")
    .select("event_id")
    .eq("status", "offered")
    .lt("offer_expires_at", new Date().toISOString());
  const eventIds = [...new Set((stale ?? []).map((r) => r.event_id as string))];

  // Every program routes through the apex in production; previews use their own host.
  const origin =
    process.env.VERCEL_ENV === "production"
      ? "https://bccacademy.io"
      : `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host") ?? "bccacademy.io"}`;
  const results: Record<string, number> = {};
  for (const id of eventIds) {
    results[id] = await promoteWaitlist(id, origin);
  }
  return NextResponse.json({ ok: true, events: eventIds.length, promoted: results });
}
