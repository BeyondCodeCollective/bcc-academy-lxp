/**
 * The instructor's voice for the FDE session stage.
 *
 * Browser speechSynthesis got us a talking page for free, but it sounds like
 * a robot and macOS ships no voice that suits this course. This proxies
 * ElevenLabs instead, so the key never reaches the browser.
 *
 * The session speaks a fixed script — about fifteen lines, identical for
 * every learner — so the same handful of strings would otherwise be
 * regenerated (and re-billed) once per person per run. They're cached by
 * hash after the first synthesis. That also means the second learner into a
 * session hears it instantly.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

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
  const text = new URL(req.url).searchParams.get("text") ?? "";
  return synthesise(text);
}

export async function POST(req: Request) {
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  return synthesise(text);
}

async function synthesise(text: unknown) {
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

  const hit = cache.get(hash);
  if (hit) {
    return new NextResponse(hit, {
      headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400", "x-fde-cache": "hit" },
    });
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
  return new NextResponse(buf, {
    headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400", "x-fde-cache": "miss" },
  });
}
