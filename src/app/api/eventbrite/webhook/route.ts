import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processEventbriteOrder } from "@/lib/eventbrite-funnel";
import { orderIdFromApiUrl } from "@/lib/eventbrite";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// order.placed backstop. Fires server-side the moment someone registers, even if
// their browser closed before the claim route ran. Payload is thin — just an
// api_url pointing at the order — so we extract the id and run the same
// idempotent provisioning. Always returns 200 so Eventbrite doesn't retry-storm
// on conditions we can't fix (unmapped event, transient resolve failure); those
// are logged, and the next genuine order still gets processed.
//
// Hardening (see docs/eventbrite-webhook.md to activate):
//   1. Set EVENTBRITE_WEBHOOK_SECRET in the env.
//   2. Register the Eventbrite payload URL as `…/api/eventbrite/webhook?key=<secret>`
//      (or send it as an `x-webhook-secret` header).
// When the secret is set we reject anything that doesn't present it (constant-time
// compare). Left UNSET, the endpoint is still low-risk — it only acts on real
// order ids that resolve through our private token — so default behavior is open
// to avoid breaking a webhook whose URL hasn't been updated yet.

export const dynamic = "force-dynamic";

function resolveOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://bccacademy.io";
}

/** Constant-time equality (avoids leaking the secret via timing). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  // Rate-limit per IP. Genuine Eventbrite webhooks come from a small set of IPs
  // at modest volume, so 120/min is generous while still capping a spammer.
  const limited = rateLimit({ key: getClientIp(req), scope: "eb-webhook", max: 120, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;
  if (secret) {
    const presented =
      req.nextUrl.searchParams.get("key") ?? req.headers.get("x-webhook-secret") ?? "";
    if (!safeEqual(presented, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
