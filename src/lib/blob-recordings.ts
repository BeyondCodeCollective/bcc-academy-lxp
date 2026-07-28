// Vercel Blob storage for class recordings.
//
// Why Blob and not the alternatives:
//   · Supabase enforces a project-wide upload cap (50 MB here, probed) and a
//     class recording is 200 MB to 1 GB.
//   · Google Drive needs a Shared Drive and a service account, both of which
//     are gated behind Workspace/Cloud admin rights we don't have.
//   · Blob is on the Vercel account we already own, has no per-file cap, and
//     costs cents per month at this volume.
//
// The store is PRIVATE. These are recordings of live classes with minors
// visible and audible, so a public URL — even an unguessable one — is the wrong
// default. Reads go through a short-lived presigned URL minted per request for
// a learner who is already enrolled and authenticated, which is the same model
// the Supabase path uses.

import "server-only";
import { put, issueSignedToken, presignUrl } from "@vercel/blob";

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Stream a recording into the private store. Returns the pathname, not a URL:
 * a presigned URL expires, so storing one in the database would hand students
 * a dead link. `session_content.recording_url` holds `blob:<pathname>`.
 */
export async function uploadRecordingToBlob(opts: {
  pathname: string;
  body: ReadableStream<Uint8Array>;
}): Promise<{ ok: true; pathname: string } | { ok: false; error: string }> {
  if (!blobConfigured()) return { ok: false, error: "BLOB_READ_WRITE_TOKEN missing" };
  try {
    const result = await put(opts.pathname, opts.body, {
      access: "private",
      contentType: "video/mp4",
      // Chunked upload — the whole point is never holding a gigabyte in memory.
      multipart: true,
      // These filenames are already unique per session; a random suffix would
      // only make the same recording unfindable across re-imports.
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { ok: true, pathname: result.pathname };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * A time-limited URL a student's browser can play directly from the Blob CDN.
 *
 * Direct-from-CDN rather than proxied through a route: piping a gigabyte
 * through a serverless function on every play would double the bandwidth bill
 * and burn function time for no access-control gain, since the presigned URL is
 * already scoped to one pathname and expires.
 */
export async function signRecordingUrl(
  pathname: string,
  ttlSeconds = 60 * 60 * 6,
): Promise<string | null> {
  if (!blobConfigured()) return null;
  try {
    const validUntil = Date.now() + ttlSeconds * 1000;
    const signed = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signed, {
      operation: "get",
      pathname,
      access: "private",
      validUntil,
    });
    return presignedUrl;
  } catch (e) {
    console.error("[blob-recordings] sign failed", pathname, e);
    return null;
  }
}
