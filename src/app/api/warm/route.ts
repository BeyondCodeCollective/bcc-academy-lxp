import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Pinged by Vercel Cron every 5 minutes to keep the Next.js function
// instance and the Supabase connection pool hot. On a low-traffic
// pre-launch portal, true cold starts cost 5-10 seconds end-to-end —
// keeping one instance warm absorbs that for real students.
//
// Vercel Cron includes an `Authorization: Bearer <CRON_SECRET>` header
// when the env var is set; if no secret is configured we accept all
// requests (useful in preview deploys and local).

export const dynamic = "force-dynamic";

// Cron fires from a single origin region (currently us-east), so this
// function always lands in iad1 regardless of preferredRegion. Pin
// explicitly to iad1 to make that intent obvious, and fan out to
// /api/warm-eu (pinned to fra1) so both regions stay hot on one cron.
export const preferredRegion = ["iad1"];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // One trivial query touches Supabase so the Postgres connection in the
  // pool stays warm too. The slow part of a cold dashboard load is the
  // first Vercel→Supabase round-trip, not the query itself.
  try {
    const svc = createServiceClient();
    await svc.from("programs").select("id").limit(1);
  } catch {
    // Don't fail the cron on transient DB issues — the goal is to keep
    // the function instance warm, which already happened by the time we
    // hit this line.
  }

  // Warm the fra1 sibling. Building the URL from the request's own host
  // keeps preview deploys and the production domain both working without
  // a hard-coded URL. Awaited so the fetch actually completes before the
  // function returns — Vercel doesn't guarantee dangling promises run.
  let euOk: boolean | null = null;
  try {
    // SSRF guard: only ever fan out to our own known hosts. A spoofed `Host`
    // header must not make the server issue a request to an arbitrary origin.
    const rawHost = request.headers.get("host") ?? "";
    const trusted = /(^|\.)bccacademy\.io$|\.vercel\.app$|^localhost(:\d+)?$/.test(rawHost);
    const host = trusted ? rawHost : (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "");
    if (host) {
      const protocol = host.startsWith("localhost") ? "http" : "https";
      const res = await fetch(`${protocol}://${host}/api/warm-eu`, {
        headers: secret ? { authorization: `Bearer ${secret}` } : {},
      });
      euOk = res.ok;
    }
  } catch {
    euOk = false;
  }

  return NextResponse.json({ ok: true, euOk, ts: new Date().toISOString() });
}
