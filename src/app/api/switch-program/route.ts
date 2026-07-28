import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getJoinablePrograms } from "@/lib/programs";

// Sets the program-override cookie and sends you on.
//
// The switcher in the user menu does this from the client, which is fine when
// you can see it. This exists so a SERVER-rendered page can offer the same
// thing: the "No program selected" screen on the apex needs to hand a
// super-admin a working way out, and a page can't set a cookie.
//
// Same cookie, same lifetime, and a full navigation afterwards — the program is
// resolved server-side from the cookie, so a client-side push would serve the
// cached route and appear to do nothing (the bug fixed in #441).

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Only a program-switching role may do this. Without the check, any signed-in
  // learner could hand themselves another program's admin context by URL.
  if (!canSwitchPrograms(ctx.student?.role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  // Allowlist from the real program registry — never trust the query string as
  // a cookie value.
  const target = getJoinablePrograms().find((p) => p.slug === slug);
  if (!target) {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  // Relative paths only, so this can't be turned into an open redirect.
  const nextParam = request.nextUrl.searchParams.get("next");
  const destination =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard/admin";

  const res = NextResponse.redirect(new URL(destination, request.url));
  res.cookies.set("program-override", target.slug, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  return res;
}
