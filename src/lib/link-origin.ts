import { headers } from "next/headers";
import { isProductionHost } from "@/lib/programs";

const CANONICAL_ORIGIN = "https://bccacademy.io";
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Origin to build emailed links on. Derived server-side from the request host
 * and returned only when that host is one this deployment serves:
 *
 *   - a production host (DOMAIN_MAP)
 *   - this deployment's own Vercel preview hosts
 *   - localhost, outside production
 *
 * Any other host gets the canonical production origin. Never accept an origin
 * from the client for this.
 */
export async function getLinkOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").trim().toLowerCase();

  if (isProductionHost(host)) return `https://${host}`;

  const deploymentHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL];
  if (host && deploymentHosts.includes(host)) return `https://${host}`;

  if (process.env.VERCEL_ENV !== "production" && LOCAL_HOST_RE.test(host)) {
    return `http://${host}`;
  }

  return CANONICAL_ORIGIN;
}
