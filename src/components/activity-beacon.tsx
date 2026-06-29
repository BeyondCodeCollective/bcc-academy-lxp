"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Beacons a `page_view` event to /api/events on every dashboard route change,
// so per-user timelines capture navigation (not just "did the work" signals).
// Fire-and-forget; failures are swallowed so analytics never affect the UX.
export function ActivityBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const trackSlug = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1] ?? null;
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "page_view",
        trackSlug,
        metadata: { path: pathname },
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
