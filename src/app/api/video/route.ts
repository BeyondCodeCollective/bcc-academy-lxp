import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy for uploaded Supabase Storage videos. Browsers require 206 Partial
// Content responses to seek in an HTML5 <video> element. Direct Supabase
// Storage public URLs don't always include the CORS headers needed for
// cross-origin Range requests, causing the player to spin indefinitely.
// This route proxies the fetch server-side — no CORS constraint — and
// forwards the proper streaming headers back to the browser.
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("path"); // e.g. "session-files/track/1/file.mp4"

  if (!storagePath) {
    return new NextResponse("Missing path", { status: 400 });
  }

  // Only allow the session-files bucket — prevents this becoming an open proxy.
  if (!storagePath.startsWith("session-files/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const originUrl = `${supabaseUrl}/storage/v1/object/public/${storagePath}`;

  const rangeHeader = request.headers.get("range");
  const fetchHeaders: Record<string, string> = {};
  if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

  let upstream: Response;
  try {
    upstream = await fetch(originUrl, { headers: fetchHeaders });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  if (upstream.status >= 400) {
    return new NextResponse("Not found", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const out = new Headers();
  for (const key of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "last-modified",
    "etag",
  ]) {
    const val = upstream.headers.get(key);
    if (val) out.set(key, val);
  }
  // Always advertise byte-range support so the browser knows it can seek.
  if (!out.has("accept-ranges")) out.set("accept-ranges", "bytes");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
