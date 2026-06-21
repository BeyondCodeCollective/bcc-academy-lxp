// Generate per-scene narration MP3s for the product demo via ElevenLabs.
// Run: node --env-file=.env.local demo/generate-audio.mjs
import { writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL"; // Bella
const MODEL = process.env.TTS_MODEL ?? "eleven_multilingual_v2";

// Tuned for a more natural read. Lower stability = more human variation; a touch
// of style adds expressiveness; speed < 1 is a hair slower/more deliberate.
// Override per-run, e.g.: STABILITY=0.4 STYLE=0.4 SPEED=0.95 node ... generate-audio.mjs
const VOICE_SETTINGS = {
  stability: Number(process.env.STABILITY ?? 0.45),
  similarity_boost: Number(process.env.SIMILARITY ?? 0.8),
  style: Number(process.env.STYLE ?? 0.3),
  use_speaker_boost: true,
  speed: Number(process.env.SPEED ?? 0.97),
};

if (!KEY) {
  console.error("ELEVENLABS_API_KEY missing (run with --env-file=.env.local)");
  process.exit(1);
}

// Student-experience cut. Keep in sync with demo/script.md.
const SCENES = [
  { n: 1, text: "Every learner lands right in their course — laid out week by week, with one clear next step." },
  { n: 2, text: "Open any week, and it's all in one place: the lesson, the materials, and the assignment." },
  { n: 3, text: "Watch the session, submit your work — and your progress fills in as you go." },
  { n: 4, text: "Every week you finish moves you forward, and your instructors see exactly where you are." },
  { n: 5, text: "One platform. Every program. From beginners to wisdom learners — human in the lead." },
];

await mkdir(new URL("./audio/", import.meta.url), { recursive: true });

for (const s of SCENES) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text: s.text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) {
    console.error(`✗ scene ${s.n} HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const file = new URL(`./audio/scene-${String(s.n).padStart(2, "0")}.mp3`, import.meta.url);
  await writeFile(file, buf);
  console.log(`✓ scene ${s.n} (${buf.length} bytes)`);
}
console.log("Done → demo/audio/");
