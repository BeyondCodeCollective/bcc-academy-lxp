import { createBrowserClient } from "@supabase/ssr";
import { authCookieDomain } from "./cookie-domain";

export function createClient() {
  // The server writes auth cookies with `domain=.bccacademy.io` (server.ts,
  // proxy.ts, auth/callback) so program subdomains share one session. Without
  // the same domain here, the browser writes a HOST-ONLY cookie of the same
  // name every time it refreshes the token. Two cookies, one name: the browser
  // sends both, Next's RequestCookies keeps only the first, and whichever that
  // is goes stale within the hour — refresh_token_not_found, learner signed
  // out. Supabase's own docs on createBrowserClient name this as a cause of
  // "random logouts, early session termination or problems with inconsistent
  // state".
  //
  // authCookieDomain returns undefined off the bccacademy.io family, so
  // localhost and Vercel previews keep host-scoped cookies.
  const domain =
    typeof window === "undefined"
      ? undefined
      : authCookieDomain(window.location.hostname);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined
  );
}
