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

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
