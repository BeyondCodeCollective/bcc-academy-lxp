// Zoom Server-to-Server OAuth client for pulling PAST-meeting attendance.
//
// Why this exists: the embedded Zoom player (see /api/zoom-signature) only
// records learners who join through the site. Anyone joining via the Zoom
// desktop/phone app or a raw meeting link is invisible to it. Zoom's own report
// captures EVERY participant regardless of how they connected — this is the
// accurate source of truth for a live cohort.
//
// Requires a Server-to-Server OAuth app (Zoom Marketplace) with the
// `report:read:admin` scope (plus meeting:read:list_past_instances:admin to
// list a day's instances, and meeting:read:meeting:admin for the host), and
// these env vars:
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
// Until those are set, `zoomReportConfigured()` is false and callers no-op —
// nothing here throws or blocks in an unconfigured environment.

import { easternDayKey } from "@/lib/utils";

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

type RawParticipant = ZoomParticipant;

/** Every participant row of ONE past meeting (numeric id or an already
 *  path-safe occurrence id). 404 = no report yet, treated as empty. */
async function fetchParticipantRows(pathId: string): Promise<RawParticipant[]> {
  const token = await getAccessToken();
  const out: RawParticipant[] = [];
  let nextPageToken = "";

  do {
    const url = new URL(`${ZOOM_API_BASE}/report/meetings/${pathId}/participants`);
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
        `Zoom participants report failed (${pathId}): ${res.status} ${await res.text()}`,
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
  return out;
}

/** One person can rejoin (network drops, or a host restarting the meeting) and
 *  produce several rows. Collapse to one per identity (email, else name),
 *  summing duration and keeping the earliest join. */
export function dedupeParticipants(rows: ZoomParticipant[]): ZoomParticipant[] {
  const byKey = new Map<string, ZoomParticipant>();
  for (const p of rows) {
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

/**
 * All participants of a PAST meeting, deduped by (email|name). `meetingId` is
 * the numeric meeting number (from parseZoomLink).
 *
 * A numeric id resolves to Zoom's LATEST instance only. Use
 * getParticipantsOnDay when the class may have been restarted.
 */
export async function getPastMeetingParticipants(
  meetingId: string,
): Promise<ZoomParticipant[]> {
  return dedupeParticipants(await fetchParticipantRows(meetingId));
}

// Zoom occurrence UUIDs can contain "/" and "+"; path params must be
// double-encoded or the API 404s. Double-encoding is accepted for every UUID.
export function zoomUuidPath(uuid: string): string {
  return encodeURIComponent(encodeURIComponent(uuid));
}

type Instance = { uuid: string; start_time: string };

/** Every past instance UUID of `meetingNumber` that STARTED on `dayKey`
 *  (yyyy-mm-dd, ET). A host who ends and restarts the meeting, or re-opens it
 *  in the evening, creates a new instance each time.
 *
 *  Primary source is /past_meetings/{id}/instances (needs
 *  meeting:read:list_past_instances:admin). If that is refused, fall back to
 *  the account's cloud recordings for the day, which only lists instances that
 *  recorded but needs no extra scope. */
export async function getInstanceUuidsOnDay(
  meetingNumber: string,
  dayKey: string,
): Promise<string[]> {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  let instances: Instance[] | null = null;

  const res = await fetch(`${ZOOM_API_BASE}/past_meetings/${meetingNumber}/instances`, { headers });
  if (res.ok) {
    instances = ((await res.json()) as { meetings?: Instance[] }).meetings ?? [];
  } else if (res.status === 404) {
    return [];
  } else {
    // Recordings are filed by UTC day; widen by a day each side so an evening
    // ET instance (next UTC day) is included, then filter on the ET day below.
    const d = new Date(`${dayKey}T12:00:00Z`);
    const from = new Date(d.getTime() - 86_400_000).toISOString().slice(0, 10);
    const to = new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10);
    instances = [];
    let nextPageToken = "";
    do {
      const url = new URL(`${ZOOM_API_BASE}/accounts/me/recordings`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      url.searchParams.set("page_size", "300");
      if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);
      const r = await fetch(url, { headers });
      if (!r.ok) {
        throw new Error(`Zoom instances lookup failed (${meetingNumber}): ${res.status}, recordings fallback ${r.status}`);
      }
      const json = (await r.json()) as {
        meetings?: (Instance & { id: number | string })[];
        next_page_token?: string;
      };
      for (const m of json.meetings ?? []) {
        if (String(m.id) === meetingNumber) instances.push(m);
      }
      nextPageToken = json.next_page_token ?? "";
    } while (nextPageToken);
  }

  const uuids = new Set<string>();
  for (const i of instances) {
    if (i.uuid && i.start_time && easternDayKey(new Date(i.start_time)) === dayKey) uuids.add(i.uuid);
  }
  return [...uuids];
}

/** Everyone who joined ANY instance of `meetingNumber` that started on
 *  `dayKey` (ET), deduped across instances. */
export async function getParticipantsOnDay(
  meetingNumber: string,
  dayKey: string,
): Promise<ZoomParticipant[]> {
  const uuids = await getInstanceUuidsOnDay(meetingNumber, dayKey);
  const all: ZoomParticipant[] = [];
  for (const uuid of uuids) all.push(...(await fetchParticipantRows(zoomUuidPath(uuid))));
  return dedupeParticipants(all);
}

/** The meeting host's email (needs meeting:read:meeting:admin), so the host
 *  account's own join ("BCC Programs") isn't mistaken for a stray guest.
 *  Null when unknown; callers then just don't skip it. */
export async function getMeetingHostEmail(meetingNumber: string): Promise<string | null> {
  const token = await getAccessToken();
  const res = await fetch(`${ZOOM_API_BASE}/meetings/${meetingNumber}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { host_email?: string };
  return json.host_email?.trim().toLowerCase() || null;
}
