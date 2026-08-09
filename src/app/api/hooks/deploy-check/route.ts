import { NextResponse } from "next/server";
import { runJourneyChecks } from "@/lib/sentinel/journeys";
import { sendSentinelReportEmail } from "@/lib/email";

// Post-deploy self-check. Point a Vercel webhook (deployment.succeeded,
// production) at /api/hooks/deploy-check?secret=<CRON_SECRET> and every deploy
// gets its critical learner pages probed within seconds. Failures email
// immediately; a clean run is silent — the nightly Sentinel brief covers
// "everything is fine".
//
// Accepts GET too so it can be run by hand to verify the wiring.

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const auth = request.headers.get("authorization");
    if (url.searchParams.get("secret") !== secret && auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const results = await runJourneyChecks();
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    await sendSentinelReportEmail({
      brief: `Post-deploy check FAILED: ${failed.length} of ${results.length} learner journeys broke. A student will hit this — check the latest deploy first.`,
      findings: failed.map((f) => ({
        check: `journey: ${f.name}`,
        severity: "high",
        message: `${f.url} → ${f.status ?? "no response"}${f.error ? ` (${f.error})` : ""}`,
        rows: [],
      })),
    });
  }

  return NextResponse.json({ ok: failed.length === 0, results });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
