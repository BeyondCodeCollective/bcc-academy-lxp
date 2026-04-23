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

  // Refresh the auth session so it doesn't expire
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Catalyst has no dashboard yet — send anyone hitting /dashboard
  // (typically cross-subdomain signed-in users) straight to the survey.
  if (
    program.slug === "catalyst" &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/survey/network-plus-post";
    return NextResponse.redirect(url);
  }

  // Only enforce auth on dashboard routes, not the login page
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|atg/|forge/).*)"],
};
