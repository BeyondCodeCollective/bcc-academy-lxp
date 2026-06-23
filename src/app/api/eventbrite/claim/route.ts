import { NextRequest, NextResponse } from "next/server";
import { processEventbriteOrder } from "@/lib/eventbrite-funnel";

// Fast path. The camp page's embedded checkout fires onOrderComplete with the
// order id; the browser POSTs it here. We provision the account synchronously
// and hand back the durable /invite/<token> URL, which the client redirects to —
// zero-click, same session, straight onto the holding page. The order.placed
// webhook is the backstop if the browser never makes this call.

export const dynamic = "force-dynamic";

function resolveOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://bccacademy.io";
}

export async function POST(req: NextRequest) {
  let orderId: string | undefined;
  try {
    const body = (await req.json()) as { orderId?: string };
    orderId = body.orderId ? String(body.orderId) : undefined;
  } catch {
    /* fall through to the missing-orderId error */
  }
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const origin = resolveOrigin(req);
  const result = await processEventbriteOrder(orderId, origin);
  if (!result.ok) {
    console.error("[eventbrite/claim] could not process order", orderId, result.error);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    redirectUrl: `${origin}/invite/${result.inviteToken}`,
  });
}
