import { NextRequest, NextResponse } from "next/server";
import { processEventbriteOrder } from "@/lib/eventbrite-funnel";
import { orderIdFromApiUrl } from "@/lib/eventbrite";

// order.placed backstop. Fires server-side the moment someone registers, even if
// their browser closed before the claim route ran. Payload is thin — just an
// api_url pointing at the order — so we extract the id and run the same
// idempotent provisioning. Always returns 200 so Eventbrite doesn't retry-storm
// on conditions we can't fix (unmapped event, transient resolve failure); those
// are logged, and the next genuine order still gets processed.
//
// Optional hardening: register the payload URL with ?key=<EVENTBRITE_WEBHOOK_SECRET>
// and we reject anything missing it. Left off, the endpoint is still low-risk —
// it only acts on real order ids that resolve through our private token.

export const dynamic = "force-dynamic";

function resolveOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://bccacademy.io";
}

export async function POST(req: NextRequest) {
  const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;
  if (secret && req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { api_url?: string; config?: { action?: string } };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const action = payload.config?.action;
  if (action && action !== "order.placed") {
    return NextResponse.json({ ok: true });
  }

  const orderId = orderIdFromApiUrl(payload.api_url);
  if (!orderId) {
    console.error("[eventbrite/webhook] no order id in payload", payload.api_url);
    return NextResponse.json({ ok: true });
  }

  const result = await processEventbriteOrder(orderId, resolveOrigin(req));
  if (!result.ok) {
    console.error("[eventbrite/webhook] could not process order", orderId, result.error);
  }
  return NextResponse.json({ ok: true });
}
