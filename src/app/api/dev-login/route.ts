import { NextResponse } from "next/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";

const DEV_HOSTS = new Set(["localhost:3000", "localhost"]);

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const host = request.headers.get("host") ?? "";
  if (!DEV_HOSTS.has(host) && !host.endsWith(".vercel.app")) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { email } = await request.json();

  // Known user or any email — always let them in during dev
  const user = getDemoUser(email);
  const storedEmail = user?.email ?? email;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, storedEmail, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
