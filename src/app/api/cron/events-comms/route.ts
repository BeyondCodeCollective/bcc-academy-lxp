import { NextResponse } from "next/server";
import { sendDueReminders, sendDueSurveys } from "@/lib/events-comms";
import { linkEventHistory } from "@/lib/events-bridge";

export const dynamic = "force-dynamic";

// Daily (14:00 UTC, mid-morning US): day-before reminders and post-event
// survey invites for events. Auth mirrors the other crons.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }
  const origin =
    process.env.VERCEL_ENV === "production"
      ? "https://bccacademy.io"
      : `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host") ?? "bccacademy.io"}`;
  const reminders = await sendDueReminders(origin);
  const surveys = await sendDueSurveys(origin);
  // Attendees whose family got learner accounts since they registered.
  const linked = await linkEventHistory();
  return NextResponse.json({ ok: true, reminders, surveys, linked });
}
