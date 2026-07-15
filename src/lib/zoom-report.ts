// Zoom Server-to-Server OAuth client for pulling PAST-meeting attendance.
//
// Why this exists: the embedded Zoom player (see /api/zoom-signature) only
// records learners who join through the site. Anyone joining via the Zoom
// desktop/phone app or a raw meeting link is invisible to it. Zoom's own report
// captures EVERY participant regardless of how they connected — this is the
// accurate source of truth for a live cohort.
//
// Requires a Server-to-Server OAuth app (Zoom Marketplace) with the
// `report:read:admin` scope, and these env vars:
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
// Until those are set, `zoomReportConfigured()` is false and callers no-op —
// nothing here throws or blocks in an unconfigured environment.

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

export function zoomReportConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET,
  );
}

// In-process token cache. S2S tokens live ~1h; refetch a minute early. The
// module is per-lambda-instance, so a hot instance reuses the token across
// invocations and cold starts just fetch a fresh one.
let cached: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.token;

  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch(
    `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(
      process.env.ZOOM_ACCOUNT_ID!,
    )}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    },
  );
  if (!res.ok) {
    throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000,
  };
  return json.access_token;
}

export type ZoomParticipant = {
  name: string;
  email: string | null;
  joinTime: string | null;
  durationSeconds: number;
};

/**
 * All participants of a PAST meeting, deduped by (email|name). `meetingId` is
 * the numeric meeting number (from parseZoomLink) or an occurrence UUID.
 *
 * Note on recurring meetings: a numeric id resolves to Zoom's LATEST occurrence,
 * which is exactly what a post-session cron wants. To target a specific past
 * occurrence, pass its double-encoded UUID instead.
 */
export async function getPastMeetingParticipants(
  meetingId: string,
): Promise<ZoomParticipant[]> {
  const token = await getAccessToken();
  const out: ZoomParticipant[] = [];
  let nextPageToken = "";

  do {
    const url = new URL(`${ZOOM_API_BASE}/report/meetings/${meetingId}/participants`);
    url.searchParams.set("page_size", "300");
    if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 404 = Zoom has no report for this meeting yet (never met, or too recent).
    // Treat as "no participants" rather than an error so the caller skips it.
    if (res.status === 404) return [];
    if (!res.ok) {
      throw new Error(
        `Zoom participants report failed (${meetingId}): ${res.status} ${await res.text()}`,
      );
    }
    const json = (await res.json()) as {
      participants?: {
        name?: string;
        user_email?: string;
        join_time?: string;
        duration?: number;
      }[];
      next_page_token?: string;
    };
    for (const p of json.participants ?? []) {
      out.push({
        name: (p.name ?? "").trim(),
        email: p.user_email?.trim().toLowerCase() || null,
        joinTime: p.join_time ?? null,
        durationSeconds: p.duration ?? 0,
      });
    }
    nextPageToken = json.next_page_token ?? "";
  } while (nextPageToken);

  // One person can rejoin (network drops) → multiple rows. Collapse to one per
  // identity, summing duration and keeping the earliest join.
  const byKey = new Map<string, ZoomParticipant>();
  for (const p of out) {
    const key = p.email ?? p.name.toLowerCase();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...p });
    } else {
      prev.durationSeconds += p.durationSeconds;
      if (p.joinTime && (!prev.joinTime || p.joinTime < prev.joinTime)) {
        prev.joinTime = p.joinTime;
      }
    }
  }
  return Array.from(byKey.values());
}
