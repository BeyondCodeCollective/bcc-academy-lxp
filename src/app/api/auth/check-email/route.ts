import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = rateLimit({
    key: getClientIp(req),
    scope: "check-email",
    max: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { allowed: true, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // Always return allowed: true to prevent email enumeration.
  // The invite/enrollment gate is enforced in the auth callback.
  return NextResponse.json({ allowed: true });
}
