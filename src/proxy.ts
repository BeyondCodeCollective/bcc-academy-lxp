import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { gateCookieMatches } from "@/lib/gate-cookie";
import {
  getProgramByDomain,
  getProgramBySlug,
  isKnownProgramHost,
} from "@/lib/programs";

// Preview override: lets a reviewer flip into a specific program experience
// on a non-production host (Vercel preview URL, vercel.app alias, localhost)
// via ?as=marketing|catalyst. With the Catalyst consolidation there's only
// one program, but the preview override is still useful for switching between
// marketing and the authenticated program view on non-production hosts.
const VALID_PREVIEW_SLUGS = new Set([
  "marketing",
  "catalyst",
]);

// Pre-launch password gate. Applies only to the marketing host
// (bccacademy.io / www.bccacademy.io) — program subdomains have their own
// auth. Exempted: the gate flow itself and public survey routes (so
// participants with a direct survey link can take it without the password).
const GATE_EXEMPT_PREFIXES = ["/gate", "/api/gate", "/survey/"];
const GATE_COOKIE = "site-access";
const MARKETING_HOSTS = new Set(["bccacademy.io", "www.bccacademy.io"]);

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";

  // ── Site password gate (marketing host only) ──────────────────────────
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && MARKETING_HOSTS.has(host)) {
    const pathname = request.nextUrl.pathname;
    const isExempt = GATE_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
    const hasAccess = gateCookieMatches(
      request.cookies.get(GATE_COOKIE)?.value,
      sitePassword,
    );
    if (!isExempt && !hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/gate";
      url.search = "";
      if (pathname !== "/") {
        url.searchParams.set("next", pathname + request.nextUrl.search);
      }
      return NextResponse.redirect(url);
    }
  }

  const asParam = request.nextUrl.searchParams.get("as");
  const previewOverride =
    asParam && VALID_PREVIEW_SLUGS.has(asParam) && !isKnownProgramHost(host)
      ? asParam
      : null;

  const program = previewOverride
    ? getProgramBySlug(previewOverride)
    : getProgramByDomain(host);

  // Forward the resolved program slug to server components via headers so
  // `getProgram()` (src/lib/programs/server.ts) doesn't have to re-derive it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-program-slug", program.slug);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const applyProgramCookies = (res: NextResponse) => {
    res.cookies.set("program-slug", program.slug, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
    });
    if (previewOverride) {
      res.cookies.set("program-override", previewOverride, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24,
      });
    }
    return res;
  };

  // Skip auth checks if Supabase isn't configured yet
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return applyProgramCookies(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Auth check only runs for routes whose redirect rules depend on it:
  // /dashboard/* (kick unauth'd users out) and "/" (kick auth'd users to
  // their dashboard). Everywhere else, skip the Supabase Auth network
  // round-trip — broadening the matcher to cover the password gate would
  // otherwise add ~100–300ms to every marketing page.
  const pathname = request.nextUrl.pathname;
  const needsAuthCheck =
    pathname === "/" || pathname.startsWith("/dashboard");
  if (!needsAuthCheck) {
    return applyProgramCookies(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const domain = authCookieDomain(host);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              domain ? { ...options, domain } : options
            )
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated and trying to access dashboard, redirect to login
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return applyProgramCookies(NextResponse.redirect(url));
  }

  // On program subdomains, redirect authenticated users from "/" to their
  // dashboard. On the marketing domain (bccacademy.io), "/" is the public
  // homepage — authenticated or not, everyone should see it.
  if (
    user &&
    request.nextUrl.pathname === "/" &&
    !previewOverride &&
    program.slug !== "marketing"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return applyProgramCookies(NextResponse.redirect(url));
  }

  return applyProgramCookies(supabaseResponse);
}

export const config = {
  // Run on every route except Next.js internals and static asset files.
  // The previous narrow matcher (["/", "/dashboard/:path*"]) meant the
  // pre-launch site-password gate never fired on /quiz, /pathways/*,
  // /privacy, /terms, /login, /certificate, /survey/*, etc. — anyone
  // could bypass the gate by guessing a path. The auth-redirect branches
  // at the bottom of `proxy()` are guarded by explicit path checks so
  // broadening the matcher does not change auth behavior; the Supabase
  // auth round-trip is short-circuited for routes that don't need it.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};
