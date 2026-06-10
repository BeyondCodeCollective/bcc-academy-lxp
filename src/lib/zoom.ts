export type ParsedZoomLink = {
  meetingNumber: string;
  password: string;
};

/**
 * Extracts meeting number and password from any Zoom meeting URL.
 * Handles zoom.us/j/XXXXXXXX, us02web.zoom.us/j/XXXXXXXX?pwd=..., etc.
 * Returns null if the URL is not a recognizable Zoom meeting link.
 */
export function parseZoomLink(url: string): ParsedZoomLink | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const isZoom =
      parsed.hostname.endsWith("zoom.us") ||
      parsed.hostname.endsWith("zoom.com");
    if (!isZoom) return null;

    // Match /j/MEETINGID or /wc/join/MEETINGID
    const match =
      parsed.pathname.match(/\/j\/(\d+)/) ||
      parsed.pathname.match(/\/wc\/join\/(\d+)/);
    if (!match) return null;

    const meetingNumber = match[1];
    const password = parsed.searchParams.get("pwd") ?? "";

    return { meetingNumber, password };
  } catch {
    return null;
  }
}

export function isZoomLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return parseZoomLink(url) !== null;
}
