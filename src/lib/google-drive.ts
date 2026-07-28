// Google Drive upload for class recordings.
//
// Why Drive: Supabase caps uploads at the project's file-size limit (50 MB on
// this project) and a class recording is 200 MB to 1 GB. Workspace storage is
// already paid for, and the platform's RecordingCard has embedded Drive links
// since the Google Meet days — so a Drive-hosted recording plays inline with no
// UI work.
//
// ─── THE GOTCHA THAT KILLS NAIVE SETUPS ─────────────────────────────────────
// A service account has NO Drive storage quota of its own. Uploading into a
// normal My Drive folder that's been "shared with" the service account fails
// with "Service Accounts do not have storage quota". The upload target MUST be
// a SHARED DRIVE with the service account added as a member (Content Manager),
// because files in a Shared Drive consume the organisation's pooled storage
// rather than an individual's. This is the single most common reason a
// Drive-upload integration appears configured and then fails on first use.
// ─────────────────────────────────────────────────────────────────────────────
//
// Auth is a signed JWT exchanged for an access token — no googleapis
// dependency, which keeps the function small enough to stream a gigabyte.
//
// Env:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  — the service account address
//   GOOGLE_PRIVATE_KEY            — its PEM key (literal \n escapes are fine)
//   GOOGLE_DRIVE_FOLDER_ID        — a folder INSIDE a Shared Drive

import "server-only";
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive";

export function driveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cached: { token: string; expiresAt: number } | null = null;

export async function driveToken(): Promise<string | null> {
  if (!driveConfigured()) return null;
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  // Env vars can't hold real newlines, so the PEM arrives with literal \n.
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const iat = Math.floor(Date.now() / 1000);
  const claim = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  };
  const unsigned =
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    base64url(JSON.stringify(claim));
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = `${unsigned}.${base64url(signer.sign(key))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error("[drive] token failed", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cached.token;
}

/**
 * Stream a file into the configured Shared Drive folder and return its share
 * URL, in the `/file/d/<id>/view` shape `toDriveEmbedUrl` already understands.
 *
 * Resumable upload, because a simple upload would need the whole file in memory
 * and these are gigabyte-scale.
 */
export async function uploadRecordingToDrive(opts: {
  name: string;
  body: ReadableStream<Uint8Array>;
  /** Content-Length when known — Drive is happier with it. */
  bytes?: number;
}): Promise<{ ok: true; url: string; fileId: string } | { ok: false; error: string }> {
  const token = await driveToken();
  if (!token) return { ok: false, error: "Drive not configured" };

  // 1. Open a resumable session.
  const start = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        name: opts.name,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        mimeType: "video/mp4",
      }),
    },
  );
  if (!start.ok) {
    const detail = (await start.text()).slice(0, 300);
    // Surface the quota error in full — it's the Shared Drive mistake above.
    return { ok: false, error: `drive session ${start.status}: ${detail}` };
  }
  const uploadUrl = start.headers.get("location");
  if (!uploadUrl) return { ok: false, error: "drive gave no upload URL" };

  // 2. Stream the bytes.
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      ...(opts.bytes ? { "Content-Length": String(opts.bytes) } : {}),
    },
    body: opts.body,
    // Required by undici to stream a request body.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  if (!put.ok) {
    return { ok: false, error: `drive upload ${put.status}: ${(await put.text()).slice(0, 200)}` };
  }
  const file = (await put.json()) as { id: string };

  // 3. Anyone with the link can view.
  //
  // Students sign in with personal Gmail addresses, not Workspace accounts, so
  // per-person sharing isn't possible and a Workspace-only file would be
  // unplayable for the whole cohort. The link is unguessable but it is NOT
  // access-controlled: anyone who obtains it can watch. That is weaker than the
  // signed-URL model, and it is the trade for using Drive.
  const perm = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );
  if (!perm.ok) {
    return {
      ok: false,
      error: `drive permission ${perm.status}: ${(await perm.text()).slice(0, 200)}`,
    };
  }

  return {
    ok: true,
    fileId: file.id,
    url: `https://drive.google.com/file/d/${file.id}/view`,
  };
}
