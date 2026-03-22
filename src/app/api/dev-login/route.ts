import { NextResponse } from "next/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
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
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
