import crypto from "node:crypto";

// Tiny helper for the pre-launch site-password gate. The proxy and the
// /api/gate route both need to derive the same opaque cookie value from
// SITE_PASSWORD; keep it in one place so the two stay in sync.

/** Returns the value that should be stored in the `site-access` cookie. */
export function gateCookieValue(sitePassword: string): string {
  return crypto
    .createHmac("sha256", "bcc-site-gate-v1")
    .update(sitePassword)
    .digest("base64url");
}

/** Constant-time compare for an incoming cookie value vs the expected. */
export function gateCookieMatches(
  incoming: string | undefined,
  sitePassword: string,
): boolean {
  if (!incoming) return false;
  const expected = gateCookieValue(sitePassword);
  if (incoming.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(incoming),
    Buffer.from(expected),
  );
}
