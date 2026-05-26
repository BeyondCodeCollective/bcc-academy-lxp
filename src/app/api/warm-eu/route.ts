import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// EU-only sibling of /api/warm. Vercel Cron fires from a single origin
// region (currently us-east), so the main /api/warm only ever warms
// iad1 even though it's bi-region. This route is pinned to fra1
// exclusively, and /api/warm fans out to it via an internal fetch so
// both regions stay hot on the same 5-minute cadence.

export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const svc = createServiceClient();
    await svc.from("programs").select("id").limit(1);
  } catch {
    // Same as /api/warm: the goal is to keep the function instance hot.
    // A transient DB blip doesn't change that.
  }

  return NextResponse.json({ ok: true, region: "fra1", ts: new Date().toISOString() });
}
