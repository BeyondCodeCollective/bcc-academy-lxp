// Zoom cloud-recording client — lists recordings and resolves each one to a
// course week, so the cron can pull them onto the platform automatically.
//
// Why this exists: sharing Zoom links doesn't work for learners. Zoom's share
// pages can demand a passcode or host approval, and cloud recordings are
// auto-deleted after the account's retention window. The recording has to live
// on the platform, and nobody is going to remember to download and re-upload it
// after every class.
//
// Shares the Server-to-Server OAuth app with `zoom-report.ts` (attendance).
// Requires ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET and the
// `cloud_recording:read:list_user_recordings:admin` scope. Unconfigured
// environments no-op rather than throw.

import "server-only";

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

export function zoomRecordingsConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET,
  );
}

let cached: { token: string; expiresAt: number } | null = null;

export async function zoomToken(): Promise<string | null> {
  if (!zoomRecordingsConfigured()) return null;
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch(
    `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(
      process.env.ZOOM_ACCOUNT_ID!,
    )}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}` } },
  );
  if (!res.ok) {
    console.error("[zoom-recordings] token failed", res.status);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: json.access_token,
    // Refetch a minute early so a long import can't run past expiry.
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cached.token;
}

export type ZoomRecording = {
  /** Per-occurrence id. A recurring meeting reuses `meetingId` for every class,
   *  so this is what makes one session distinct from the next. */
  uuid: string;
  meetingId: string;
  topic: string;
  /** ISO start time, UTC. */
  startTime: string;
  durationMinutes: number;
  /** Authenticated download URL for the MP4 — needs the bearer token. */
  downloadUrl: string;
  bytes: number;
};

type ZoomFile = {
  file_type?: string;
  download_url?: string;
  file_size?: number;
  recording_type?: string;
};

/**
 * Every cloud recording in the window. Zoom caps each query at one month, so
 * the range is walked month by month.
 */
export async function listRecordings(
  fromISO: string,
  toISO: string,
): Promise<ZoomRecording[]> {
  const token = await zoomToken();
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };

  const out: ZoomRecording[] = [];
  for (const [from, to] of monthWindows(fromISO, toISO)) {
    let nextPage = "";
    do {
      const url = new URL(`${ZOOM_API_BASE}/accounts/me/recordings`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      url.searchParams.set("page_size", "300");
      if (nextPage) url.searchParams.set("next_page_token", nextPage);

      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error("[zoom-recordings] list failed", from, res.status);
        break;
      }
      const json = (await res.json()) as {
        meetings?: {
          uuid: string;
          id: number | string;
          topic: string;
          start_time: string;
          duration: number;
          recording_files?: ZoomFile[];
        }[];
        next_page_token?: string;
      };

      for (const m of json.meetings ?? []) {
        // Prefer the shared-screen-with-speaker view when Zoom saved several
        // MP4 renditions; otherwise take the first video file.
        const videos = (m.recording_files ?? []).filter(
          (f) => f.file_type === "MP4" && f.download_url,
        );
        const file =
          videos.find((f) => f.recording_type === "shared_screen_with_speaker_view") ??
          videos[0];
        if (!file?.download_url) continue;
        out.push({
          uuid: m.uuid,
          meetingId: String(m.id),
          topic: m.topic,
          startTime: m.start_time,
          durationMinutes: m.duration,
          downloadUrl: file.download_url,
          bytes: file.file_size ?? 0,
        });
      }
      nextPage = json.next_page_token || "";
    } while (nextPage);
  }
  return out;
}

/** Zoom rejects ranges longer than a month — split before querying. */
function monthWindows(fromISO: string, toISO: string): [string, string][] {
  const windows: [string, string][] = [];
  const end = new Date(toISO);
  let cursor = new Date(fromISO);
  while (cursor <= end) {
    const windowEnd = new Date(cursor);
    windowEnd.setDate(windowEnd.getDate() + 29);
    windows.push([
      cursor.toISOString().slice(0, 10),
      (windowEnd > end ? end : windowEnd).toISOString().slice(0, 10),
    ]);
    cursor = new Date(windowEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return windows;
}

/** The date a class was actually held, in Eastern time — cohorts are scheduled
 *  in ET, and a 10pm-UTC class is the same evening, not the next morning. */
export function easternDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Zoom meeting id out of a stored meeting link (`/j/<id>`). */
export function meetingIdFromLink(link: string | null): string | null {
  return link?.match(/\/j\/(\d+)/)?.[1] ?? null;
}
