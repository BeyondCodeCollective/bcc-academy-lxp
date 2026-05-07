import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getProgramByDomain, getProgramBySlug, isKnownProgramHost } from "@/lib/programs";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";

// Query-param program override. Lets a reviewer (e.g. CEO previewing the
// marketing site on a Vercel preview URL) flip into a specific program
// experience without DNS or env config: ?as=marketing|atg|forge|catalyst
//
// Only honored on non-production hosts. Once set, persists via the
// existing program-override cookie (24h) so subsequent navigation works.
const VALID_PREVIEW_SLUGS = new Set(["marketing", "atg", "forge", "catalyst"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";

  // Honor ?as= override first, but only on non-production hosts. On a real
  // bccacademy.io subdomain the URL always wins for safety.
  const asParam = request.nextUrl.searchParams.get("as");
  const previewOverride =
    asParam && VALID_PREVIEW_SLUGS.has(asParam) && !isKnownProgramHost(host)
      ? asParam
      : null;

  const program = previewOverride
    ? getProgramBySlug(previewOverride)
    : getProgramByDomain(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-program-slug", program.slug);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.cookies.set("program-slug", program.slug, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  // Persist the preview override for 24h so the reviewer can click around
  // /quiz, /pathways/*, etc. without re-adding ?as= to every URL.
  if (previewOverride) {
    supabaseResponse.cookies.set("program-override", previewOverride, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
        const domain = authCookieDomain(host);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, domain ? { ...options, domain } : options)
        );
        // Re-set program cookie and debug headers after response recreation
        supabaseResponse.cookies.set("program-slug", program.slug, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
        });
      },
    },
  });

  // getClaims verifies the JWT locally. getUser makes a network call to
  // Supabase Auth on every request, which was the dominant latency cost on
  // every dashboard navigation.
  const authStart = performance.now();
  const { data: claimsData } = await supabase.auth.getClaims();
  const authMs = Math.round(performance.now() - authStart);
  const hasAuth = !!claimsData?.claims;

  // Programs with no tracks (dashboardless) redirect /dashboard to their
  // primary survey. Catalyst used to be survey-only but now has tracks, so
  // this only fires if the config has zero tracks. Marketing is excluded —
  // it's a public site, not a program, and has no surveys.
  if (
    program.slug !== "marketing" &&
    program.tracks.length === 0 &&
    request.nextUrl.pathname.startsWith("/dashboard") &&
    !request.nextUrl.pathname.startsWith("/dashboard/admin")
  ) {
    const survey = program.surveys?.[0];
    if (survey) {
      const url = request.nextUrl.clone();
      url.pathname = `/survey/${survey.id}`;
      return NextResponse.redirect(url);
    }
  }


  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!hasAuth) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  console.log(`[mw] ${request.method} ${request.nextUrl.pathname} auth=${authMs}ms`);

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|atg/|forge/|catalyst/).*)"],
};
