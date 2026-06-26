import { NextRequest, NextResponse } from "next/server";
import { processEventbriteOrder } from "@/lib/eventbrite-funnel";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// The camp page's embedded checkout fires onOrderComplete with the order id;
// the browser POSTs it here so we provision the account synchronously (allowlist
// + invite token + confirmation email) the instant checkout completes, rather
// than waiting on the order.placed webhook.
//
// SECURITY: we deliberately do NOT return the /invite/<token> login URL. That
// token mints a magic link that logs the visitor in AS the order's buyer, and
// this endpoint is keyed only on an attacker-suppliable, enumerable order id —
// returning it turned the route into an account-takeover oracle. The invite
// link is delivered solely via the confirmation email sent to the buyer's own
// address (the only party that proves ownership of that inbox).

export const dynamic = "force-dynamic";

function resolveOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://bccacademy.io";
}

export async function POST(req: NextRequest) {
  // Each claim does ~9s of Eventbrite lookups (the retry loop) — rate-limit per
  // IP so a script can't amplify that into a quota/DoS hit. A real registrant
  // calls this once (maybe a retry), so 8/min is generous.
  const limited = rateLimit({ key: getClientIp(req), scope: "eb-claim", max: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

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
  // The claim fires the instant checkout completes, before Eventbrite has the
  // order queryable — retry the lookup for ~9s so the in-session redirect works
  // instead of falling through to the (slower) email path.
  const result = await processEventbriteOrder(orderId, origin, 6);
  if (!result.ok) {
    console.error("[eventbrite/claim] could not process order", orderId, result.error);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Provisioned + email sent. Never echo the invite token (see SECURITY note
  // above) — the buyer logs in via the link in their own inbox.
  return NextResponse.json({ ok: true });
}
