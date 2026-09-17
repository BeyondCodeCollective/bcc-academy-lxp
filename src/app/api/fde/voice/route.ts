/**
 * The instructor's voice for the FDE session stage.
 *
 * Browser speechSynthesis got us a talking page for free, but it sounds like
 * a robot and macOS ships no voice that suits this course. This proxies
 * ElevenLabs instead, so the key never reaches the browser.
 *
 * The session speaks a fixed script — about forty lines, identical for every
 * learner — so the same strings would otherwise be regenerated, and re-billed,
 * once per person per run.
 *
 * Caching is three-deep, because the first two layers do not survive scale:
 *
 *  1. An in-process Map. Free, and empty on every cold start. With one class
 *     of learners hitting different lambda instances, most requests miss it.
 *  2. Vercel Blob, keyed by the same hash. Durable and shared by every
 *     instance and every deploy, so a line is bought from ElevenLabs once,
 *     ever. This is the layer that makes the front door free at community
 *     size.
 *  3. The CDN. The response used to be `private`, which forbids any shared
 *     cache; a line keyed by the hash of its own text can safely be public and
 *     immutable — you cannot fetch audio without already knowing the exact
 *     sentence that made it.
 *
 * Personalized lines (the ones carrying a learner's first name) opt out with
 * `p=1`: no Blob copy, no shared cache. A name is not something to leave in a
 * CDN, however unreachable it is in practice.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { head, put } from "@vercel/blob";

/** Brooklyn — American, warm and confident. Override per environment. */
const DEFAULT_VOICE = "zWoalRDt5TZrmW4ROIA7";
const MODEL = "eleven_turbo_v2_5";

/** Cap the cache so a long-running instance can't grow without bound. */
const MAX_ENTRIES = 120;
const cache = new Map<string, ArrayBuffer>();

function remember(key: string, buf: ArrayBuffer) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, buf);
}

/**
 * GET, not POST, and deliberately.
 *
 * The obvious client is `fetch()` then `new Audio(URL.createObjectURL(blob))`
 * — but the app's CSP has no `blob:` in `media-src`, so the element is
 * blocked and the session falls back to the robot voice without ever saying
 * why. A same-origin GET is playable directly by `new Audio(url)`, needs no
 * CSP change, and lets the browser cache the audio for free.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  return synthesise(params.get("text") ?? "", params.get("p") === "1");
}

export async function POST(req: Request) {
  let text: string;
  let personal = false;
  try {
    const body = await req.json();
    text = body.text;
    personal = body.personal === true;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  return synthesise(text, personal);
}

/** One year, immutable: the URL contains the exact text, so the bytes behind
 *  it can never change. Personalized lines never get this. */
const SHARED_CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";
const PRIVATE_CACHE = "private, max-age=86400";

const blobPath = (hash: string) => `fde-voice/${hash}.mp3`;

/** The durable layer. Any failure here is a cache miss, never an error: the
 *  session has to keep talking even if Blob is unreachable or unconfigured. */
async function fromBlob(hash: string): Promise<ArrayBuffer | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(blobPath(hash));
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function toBlob(hash: string, buf: ArrayBuffer): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await put(blobPath(hash), buf, {
      access: "public",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
  } catch (err) {
    // Losing the durable copy costs money, not correctness. Say so in the
    // logs and carry on serving the bytes we already have.
    console.error("[fde/voice] blob write failed", (err as Error).message);
  }
}

async function synthesise(text: unknown, personal = false) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "voice_unconfigured" }, { status: 503 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // The script's longest line is well under this; anything larger is not ours.
  if (text.length > 1200) {
    return NextResponse.json({ error: "too_long" }, { status: 413 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const hash = createHash("sha256").update(`${voiceId}:${MODEL}:${text}`).digest("hex");

  const cacheControl = personal ? PRIVATE_CACHE : SHARED_CACHE;

  const hit = cache.get(hash);
  if (hit) {
    return new NextResponse(hit, {
      headers: { "content-type": "audio/mpeg", "cache-control": cacheControl, "x-fde-cache": "memory" },
    });
  }

  if (!personal) {
    const stored = await fromBlob(hash);
    if (stored) {
      remember(hash, stored);
      return new NextResponse(stored, {
        headers: { "content-type": "audio/mpeg", "cache-control": cacheControl, "x-fde-cache": "blob" },
      });
    }
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    console.error("[fde/voice] elevenlabs failed", res.status, (await res.text()).slice(0, 300));
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }

  const buf = await res.arrayBuffer();
  remember(hash, buf);
  if (!personal) await toBlob(hash, buf);
  return new NextResponse(buf, {
    headers: { "content-type": "audio/mpeg", "cache-control": cacheControl, "x-fde-cache": "miss" },
  });
}
