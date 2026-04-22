import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getProgramByDomain } from "@/lib/programs";

export async function middleware(request: NextRequest) {
  // Resolve program from hostname and propagate via header + cookie
  const host = request.headers.get("host") ?? "localhost:3000";
  const program = getProgramByDomain(host);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-program-slug", program.slug);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.cookies.set("program-slug", program.slug, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

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
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|atg/|forge/).*)"],
};
