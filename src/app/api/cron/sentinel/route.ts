import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import { runSentinelChecks } from "@/lib/sentinel/checks";
import { applyDismissals, getDismissals } from "@/lib/sentinel/dismissals";
import { sendSentinelReportEmail } from "@/lib/email";

// Nightly cron (Vercel): runs every Sentinel data-integrity and launch-readiness
// check, has the model write a short plain-language brief, and emails the daily
// report. The same checks render live on admin → Platform Health; this route
// exists so a bad night is announced instead of waiting to be discovered.
//
// Auth mirrors /api/warm: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
// when the env var is set; with no secret we accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];

// Same gateway routing as the tutor (src/app/api/tutor/route.ts).
const MODEL = "google/gemini-2.5-flash";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const svc = createServiceClient();
  let findings;
  try {
    // Dismissed rows are acknowledged won't-fixes. Filtering here as well as on
    // the page is the point: re-reporting them every morning is exactly what
    // dismissing them was meant to stop.
    findings = applyDismissals(await runSentinelChecks(svc), await getDismissals(svc)).visible;
  } catch (err) {
    console.error("[cron/sentinel] checks failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const brief = await writeBrief(findings);
  await sendSentinelReportEmail({ brief, findings });

  return NextResponse.json({ ok: true, findings: findings.length });
}

/** One short paragraph a human reads before coffee. Falls back to a counted
 *  summary when the gateway is unreachable — the report must still send. */
async function writeBrief(
  findings: Awaited<ReturnType<typeof runSentinelChecks>>,
): Promise<string> {
  if (findings.length === 0) {
    return "All clear. Every data invariant holds and no upcoming course is missing a roster or meeting link.";
  }
  const fallback = () => {
    const high = findings.filter((f) => f.severity === "high").length;
    return `${findings.length} finding(s), ${high} high severity. Details below.`;
  };
  try {
    const { text } = await generateText({
      model: MODEL,
      maxOutputTokens: 300,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      system:
        "You summarize a learning platform's nightly self-audit for its operator. Write 2-4 plain sentences: lead with what needs action first, group the rest. No greetings, no markdown, no bullet points. Never use em dashes.",
      prompt: JSON.stringify(
        findings.map((f) => ({
          check: f.check,
          severity: f.severity,
          message: f.message,
          examples: f.rows.slice(0, 5).map((r) => r.label),
        })),
      ),
    });
    return text.trim() || fallback();
  } catch (err) {
    console.error("[cron/sentinel] brief generation failed", err);
    return fallback();
  }
}
