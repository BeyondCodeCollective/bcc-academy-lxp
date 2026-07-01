/**
 * Sink for CSP violation reports (the `report-uri` in next.config.ts).
 * Logs the violated directive + blocked URI so regressions like the Zoom
 * blob-worker block are visible in Vercel logs instead of 404ing silently.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const r = body["csp-report"] ?? body;
    console.warn(
      "[csp-report]",
      r["violated-directive"] ?? r["effectiveDirective"] ?? "?",
      "blocked:",
      r["blocked-uri"] ?? r["blockedURL"] ?? "?",
      "on:",
      r["document-uri"] ?? r["documentURL"] ?? "?"
    );
  } catch {
    // Malformed report — nothing to do
  }
  return new Response(null, { status: 204 });
}
