// Whether this environment can reach the AI Gateway at all.
//
// Evals SKIP without credentials rather than fail. A suite that throws on a
// missing key reports a red build for a configuration problem, which is exactly
// how the Playwright smoke suite trained everyone to ignore it: every run went
// red for a missing secret, so nobody read the runs where something was
// actually broken.
//
// Either credential works. On Vercel and in CI that is AI_GATEWAY_API_KEY;
// locally it is usually VERCEL_OIDC_TOKEN, refreshed by `vercel env pull`,
// which is the documented local workflow and is verified to authenticate.
//
// The OIDC token expires within hours. An expired one produces a clear
// GatewayAuthenticationError rather than a wrong answer, so it is better to
// attempt the run and fail loudly than to skip a suite the developer expected
// to see execute.

export function hasGatewayCredentials(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export const NO_CREDENTIALS_REASON =
  "No AI Gateway credentials — skipping model evals. Locally: run `vercel env pull` to refresh VERCEL_OIDC_TOKEN (it expires within hours). In CI: set AI_GATEWAY_API_KEY as a repo secret.";

/** Print the reason once per suite so a skipped run says why. */
export function warnIfSkipping(suite: string): void {
  if (!hasGatewayCredentials()) {
    console.warn(`[evals] ${suite}: ${NO_CREDENTIALS_REASON}`);
  }
}

/**
 * Was this a gateway rate limit rather than a bad answer?
 *
 * The distinction is the whole point. A rate-limited run tells you nothing
 * about tutor quality, and reporting it as a failed eval is a lie that trains
 * you to ignore red — the exact habit the dead smoke suite created. Callers
 * skip on true instead of failing.
 */
export function isRateLimited(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate.?limit|too many requests|429|paid credits/i.test(msg);
}

/** Pace between model calls. Mirrors the 550ms the mail scripts use for Resend:
 *  slow enough to stay under a burst limit, fast enough to finish. */
export async function pace(ms = 600): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
