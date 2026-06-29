import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { logActivityEvent, type ActivityEventType } from "@/lib/analytics/log-event";

// Client-side activity ingest. The browser beacons page views (and, later,
// in-video progress) here; server-side events like `login` are logged directly
// from their handlers, not via this route. Auth'd to the calling user — the
// user_id is taken from the session, never the request body.

export const dynamic = "force-dynamic";

// Only events a client is allowed to emit. `login` is server-only.
const CLIENT_EVENTS = new Set<ActivityEventType>(["page_view", "video_progress"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let body: { eventType?: string; trackSlug?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const eventType = body.eventType as ActivityEventType;
  if (!CLIENT_EVENTS.has(eventType)) {
    return new NextResponse("Unsupported event", { status: 400 });
  }

  const programId = await getProgramId().catch(() => null);
  await logActivityEvent({
    userId: user.id,
    eventType,
    programId,
    trackSlug: typeof body.trackSlug === "string" ? body.trackSlug : null,
    metadata:
      body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  });

  return NextResponse.json({ ok: true });
}
