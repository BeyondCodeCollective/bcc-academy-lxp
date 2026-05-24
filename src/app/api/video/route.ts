import { NextRequest, NextResponse } from "next/server";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

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
  const normalized = path.normalize(storagePath).replace(/\\/g, "/");
  if (!normalized.startsWith("session-files/") || normalized.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const originUrl = `${supabaseUrl}/storage/v1/object/public/${normalized}`;

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

  // Check content-length against limit to prevent OOM on large files.
  const contentLength = upstream.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
    return new NextResponse("File too large", { status: 413 });
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
