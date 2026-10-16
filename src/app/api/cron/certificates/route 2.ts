import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sweepAutoCertificates } from "@/lib/certificates/auto";

// Nightly pass over tracks with `autoCertificate`: issues any certificate the
// on-watch hook missed and files every certificate not yet in the Drive folder.
// Auth mirrors /api/warm: `Authorization: Bearer <CRON_SECRET>`; no secret
// means accept all (preview/local).

export const dynamic = "force-dynamic";
export const preferredRegion = ["iad1"];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await sweepAutoCertificates(createServiceClient());
  if (result.errors.length) console.error("[cron/certificates]", result.errors);
  return NextResponse.json(result);
}
