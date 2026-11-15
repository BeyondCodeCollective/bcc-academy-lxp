/**
 * Sink for CSP violation reports (the `report-uri` in next.config.ts).
 * Logs the violated directive + blocked URI so regressions like the Zoom
 * blob-worker block are visible in Vercel logs instead of 404ing silently.
 */
export async function POST(request: Request) {
  // ?ro=1 marks the strict report-only policy (src/lib/csp-report-only.ts).
  const tag = new URL(request.url).searchParams.has("ro")
    ? "[csp-report-only]"
    : "[csp-report]";
  try {
    const text = await request.text();
    if (text.length > 8192) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    const r = body["csp-report"] ?? body;
    const clean = (v: unknown) => String(v ?? "?").replace(/[\r\n]/g, " ").slice(0, 300);
    console.warn(
      tag,
      clean(r["violated-directive"] ?? r["effectiveDirective"]),
      "blocked:",
      clean(r["blocked-uri"] ?? r["blockedURL"]),
      "on:",
      clean(r["document-uri"] ?? r["documentURL"])
    );
  } catch {
    // Malformed report — nothing to do
  }
  return new Response(null, { status: 204 });
}
