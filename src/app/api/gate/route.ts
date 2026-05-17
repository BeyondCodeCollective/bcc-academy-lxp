import { NextResponse, type NextRequest } from "next/server";
import { gateCookieValue } from "@/lib/gate-cookie";

const COOKIE_NAME = "site-access";
const ONE_WEEK = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: true });
  }

  const form = await req.formData();
  const submitted = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  if (submitted !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/gate";
    url.searchParams.set("error", "1");
    if (next && next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const target = req.nextUrl.clone();
  target.pathname = safeNext;
  target.search = "";

  const res = NextResponse.redirect(target, { status: 303 });
  // Cookie carries an HMAC of the password, not the raw value. Anyone with
  // browser access used to be able to read the password from devtools and
  // share it. The proxy compares via timingSafeEqual to the same HMAC.
  res.cookies.set(COOKIE_NAME, gateCookieValue(expected), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: ONE_WEEK,
  });
  return res;
}
