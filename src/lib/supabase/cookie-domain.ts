// Returns the cookie `domain` attribute to use so Supabase auth cookies are
// shared across program subdomains (forge.bccacademy.io, atg.bccacademy.io).
// Returns undefined for localhost, Vercel preview URLs, or any host outside
// the bccacademy.io family — those keep the default host-scoped behavior.
export function authCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const h = host.split(":")[0].toLowerCase();
  if (h === "bccacademy.io" || h.endsWith(".bccacademy.io")) return ".bccacademy.io";
  return undefined;
}
