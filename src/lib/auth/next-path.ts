/**
 * Validate a `?next=` destination before we redirect a user to it after login.
 *
 * `next` arrives from the URL, so it is attacker-controlled: without a check it
 * is an open redirect ("?next=https://evil.example", or the protocol-relative
 * "?next=//evil.example"). We only ever want to send someone back to a page
 * inside the learner dashboard, so require exactly that.
 *
 * Returns the path when it is safe to redirect to, else null.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Must be a same-origin absolute path into the dashboard...
  if (!next.startsWith("/dashboard")) return null;
  // ...and not a protocol-relative URL ("//host"), nor the backslash variant
  // some browsers normalize into one ("/\host").
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  // Reject whitespace and control characters, which can split a redirect
  // header. A literal hyphen stays legal: "/dashboard/track/comptia-security".
  for (const ch of next) {
    const code = ch.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f) return null;
  }
  return next;
}
