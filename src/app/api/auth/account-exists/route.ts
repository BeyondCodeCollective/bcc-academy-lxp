import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = rateLimit({
    key: getClientIp(req),
    scope: "account-exists",
    max: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { exists: true, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // Always return exists: true to prevent email enumeration.
  // The auth callback is the real gate — it rejects unadmitted users.
  return NextResponse.json({ exists: true });
}
