import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isPrivilegedEmail } from "@/lib/auth/admins";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Endpoint reveals whether a given email has an account — pure enumeration
  // oracle if unrate-limited. Cap per-IP to slow scrapers; an attacker can
  // still distribute across IPs but the friction is real.
  const limit = rateLimit({
    key: getClientIp(req),
    scope: "account-exists",
    max: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { exists: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ exists: false });
  }

  if (isPrivilegedEmail(email)) {
    return NextResponse.json({ exists: true });
  }

  const svc = createServiceClient();
  const { data } = await svc
    .from("students")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
