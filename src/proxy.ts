import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import {
  getProgramByDomain,
  getProgramBySlug,
  isKnownProgramHost,
} from "@/lib/programs";

// Preview override: lets a reviewer flip into a specific program experience
// on a non-production host (Vercel preview URL, vercel.app alias, localhost)
// via ?as=marketing|atg|forge|catalyst. Persisted as a 24h
// `program-override` cookie so subsequent navigation works without re-adding
// the query param. Production hosts (atg.bccacademy.io etc.) ignore this —
// the URL always wins on the real domain.
const VALID_PREVIEW_SLUGS = new Set(["marketing", "atg", "forge", "catalyst"]);

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";
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
    });
    if (previewOverride) {
      res.cookies.set("program-override", previewOverride, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
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

  // If authenticated and on login page, redirect to dashboard — except when
  // a preview override is active, since the reviewer is intentionally trying
  // to see the marketing/program landing rather than their own dashboard.
  if (user && request.nextUrl.pathname === "/" && !previewOverride) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return applyProgramCookies(NextResponse.redirect(url));
  }

  return applyProgramCookies(supabaseResponse);
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
