import { NextResponse } from "next/server";
import { sendDueSignupReminders } from "@/lib/signup-reminders";

export const dynamic = "force-dynamic";

// Hourly: one-week, 24-hour and 1-hour reminders for landing-page signups.
// Auth mirrors the other crons.
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
  const result = await sendDueSignupReminders(origin);
  return NextResponse.json({ ok: true, ...result });
}
