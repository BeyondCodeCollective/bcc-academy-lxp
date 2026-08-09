// Synthetic learner journeys: fetch the pages a student actually hits and
// verify they respond. Not a test suite — a tripwire. The worst launch bugs
// (Safe Links, broken login, a 500 on the join page) all showed up as "a page
// a learner needed didn't load", which is exactly what this catches.

export type JourneyResult = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bccacademy.io";

// Public, unauthenticated surfaces on the learner's critical path. Each must
// return a 2xx with a real HTML body (an error page that still 200s would slip
// past a bare status check, so require some substance).
const JOURNEYS: { name: string; path: string }[] = [
  { name: "Home / sign-in", path: "/" },
  { name: "Join page (Catalyst)", path: "/join/catalyst" },
  { name: "Dashboard redirect", path: "/dashboard" },
];

export async function runJourneyChecks(): Promise<JourneyResult[]> {
  return Promise.all(
    JOURNEYS.map(async ({ name, path }) => {
      const url = `${BASE}${path}`;
      try {
        const res = await fetch(url, {
          redirect: "follow",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
          headers: { "user-agent": "BCC-Sentinel/1.0 (+deploy-check)" },
        });
        if (!res.ok) return { name, url, ok: false, status: res.status };
        const body = await res.text();
        if (body.length < 500) {
          return { name, url, ok: false, status: res.status, error: "body suspiciously small" };
        }
        return { name, url, ok: true, status: res.status };
      } catch (err) {
        return {
          name,
          url,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
}
