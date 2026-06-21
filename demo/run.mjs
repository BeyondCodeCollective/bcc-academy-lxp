// Product-demo runner — drives real Chrome AND the real macOS cursor (via cliclick)
// so Screen Studio's auto-zoom/cursor effects follow the automation. Playwright
// handles navigation/typing/finding elements; os-cursor moves+clicks the real mouse.
// Phase 1 scenes (no login): Roblox landing, sign-up form, invite email,
// signup-notification email, homepage hero.
//
//   pnpm dev   (in another terminal — must be running on :3000)
//   WITH_AUDIO=1 node demo/run.mjs       # live Bella narration
//   node demo/run.mjs                    # silent (add narration in Screen Studio)
//   BUFFER_MS=6000 ... node demo/run.mjs # longer lead-in
//
// Don't touch the mouse/keyboard while it runs — it's driving the real cursor.
import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { cliclickAvailable, pointAt, clickAt } from "./os-cursor.mjs";

const BASE = process.env.DEMO_BASE ?? "http://localhost:3000";
const WITH_AUDIO = process.env.WITH_AUDIO === "1";

// Portal login (Phase 2): mint a magic-link callback for the demo student so the
// runner can walk into the authenticated portal. Needs Supabase env — run with
// node --env-file=.env.local demo/run.mjs
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo.maya@bccacademy.io";
const DEMO_TRACK = process.env.DEMO_TRACK ?? "ai-literacy";
const DEMO_JOIN = process.env.DEMO_JOIN ?? "forte";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function mintLoginUrl() {
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn("⚠ No Supabase env — skipping portal login. Run: node --env-file=.env.local demo/run.mjs");
    return null;
  }
  try {
    const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
    const th = data?.properties?.hashed_token;
    if (error || !th) { console.warn("⚠ generateLink failed:", error?.message ?? "no token"); return null; }
    // Carry join/track/email so the callback's invite gate passes and routes to
    // the right program — without these it bounces to /login?error=invite.
    const params = new URLSearchParams({
      token_hash: th, type: "magiclink", join: DEMO_JOIN, track: DEMO_TRACK, email: DEMO_EMAIL,
    });
    return `${BASE}/auth/callback?${params}`;
  } catch (e) {
    console.warn("⚠ mintLoginUrl error:", e.message?.split("\n")[0]);
    return null;
  }
}
// RECORD=1 makes the runner start/stop Screen Studio itself via its global
// shortcut, so you never switch windows. Set SS_HOTKEY to match Screen Studio's
// Start/Stop Recording shortcut (Settings → Shortcuts). SS_COUNTDOWN_MS waits out
// Screen Studio's own 3-2-1 before the demo acts.
const RECORD = process.env.RECORD === "1";
const SS_HOTKEY = process.env.SS_HOTKEY ?? "cmd shift 8";
const SS_COUNTDOWN_MS = Number(process.env.SS_COUNTDOWN_MS ?? 5500);

function sendHotkey(combo) {
  const parts = combo.toLowerCase().split(/\s+/).filter(Boolean);
  const key = parts.pop();
  const modMap = { cmd: "command down", command: "command down", shift: "shift down", alt: "option down", option: "option down", ctrl: "control down", control: "control down" };
  const mods = parts.map((p) => modMap[p]).filter(Boolean).join(", ");
  const using = mods ? ` using {${mods}}` : "";
  try {
    execFileSync("osascript", ["-e", `tell application "System Events" to keystroke "${key}"${using}`], { stdio: "ignore" });
  } catch (e) {
    console.warn("⚠ could not send Screen Studio hotkey:", e.message?.split("\n")[0]);
  }
}
const audioDir = new URL("./audio/", import.meta.url);
const emailFile = (n) => "file://" + fileURLToPath(new URL(`./emails/${n}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function narrate(file) {
  if (!WITH_AUDIO) return null;
  const p = spawn("afplay", [fileURLToPath(new URL(file, audioDir))]);
  return new Promise((res) => p.on("exit", res));
}

// Buttery in-page scroll (rAF easing) — no wheel events, so scroll-animated
// landing pages don't jolt.
async function smoothScrollTo(page, toY, duration = 2400) {
  await page.evaluate(
    ({ toY, duration }) =>
      new Promise((res) => {
        const startY = window.scrollY;
        const dist = toY - startY;
        const t0 = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, startY + dist * ease(p));
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    { toY, duration },
  );
}

const COURSE = `${BASE}/dashboard/track/${DEMO_TRACK}`;

// Log the demo student in and land on the course overview. Run BEFORE recording
// starts so the login itself is never on camera.
async function loginToPortal(page) {
  const url = await mintLoginUrl();
  if (url) await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
  await page.goto(COURSE, { waitUntil: "networkidle" }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await wait(600);
}

// Student-experience cut (already logged in on the course overview).
const scenes = [
  {
    n: 1, audio: "scene-01.mp3", // lands in their course, week by week
    async run(page) {
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await wait(1600); // let the course overview fully settle — no load jank
      // One eased, slightly-arced glide to the primary CTA. Single deliberate
      // move reads premium; Screen Studio zooms cleanly on it.
      const cta = page.getByRole("link", { name: /open week/i }).first();
      if (await cta.count()) await pointAt(page, cta);
      else await pointAt(page, page.getByText(/jump to any week/i).first()).catch(() => {});
      await wait(1600);
    },
  },
  {
    n: 2, audio: "scene-02.mp3", // open a week — lesson, materials, assignment
    async run(page) {
      const wk = page.locator(`a[href*="/track/${DEMO_TRACK}/1"]`).first();
      if (await wk.count()) await clickAt(page, wk);
      else await page.goto(`${COURSE}/1`, { waitUntil: "networkidle" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await wait(1200);
      await pointAt(page, page.locator("h1").first()).catch(() => {});
    },
  },
  {
    n: 3, audio: "scene-03.mp3", // watch + submit, progress fills
    async run(page) {
      await smoothScrollTo(page, 560, 2200);
      await pointAt(page, page.getByText(/week completion|materials|submit/i).first()).catch(() => {});
      await wait(1000);
    },
  },
  {
    n: 4, audio: "scene-04.mp3", // progress — back to the overview
    async run(page) {
      // Real click on the course breadcrumb to go back (clicking-through feel).
      const crumb = page.getByRole("link", { name: /ai literacy|foundations/i }).first();
      if (await crumb.count()) await clickAt(page, crumb);
      else await page.goto(COURSE, { waitUntil: "networkidle" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await wait(1000);
      await pointAt(page, page.getByText(/in progress/i).first()).catch(() => {});
      await wait(1000);
    },
  },
  {
    n: 5, audio: "scene-05.mp3", // brand close
    async run(page) {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await wait(1500);
      await pointAt(page, page.getByPlaceholder(/email/i).first()).catch(() => {});
      await wait(1500);
    },
  },
];

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, (a) => { rl.close(); res(a); });
});

if (!cliclickAvailable()) {
  console.warn("\n⚠  cliclick not detected. Install: brew install cliclick");
  console.warn("   Also grant your terminal Accessibility permission:");
  console.warn("   System Settings → Privacy & Security → Accessibility → enable your terminal.\n");
}

const browser = await chromium.launch({ headless: false, channel: "chrome", slowMo: 80, args: ["--start-maximized"] })
  .catch(() => chromium.launch({ headless: false, slowMo: 80, args: ["--start-maximized"] }));
const page = await browser.newPage({ viewport: null });
await page.goto(`${BASE}/`).catch(() => {});

if (RECORD) {
  await ask(`\n▶  Press Enter — I'll log the demo student in off-camera, start Screen Studio (${SS_HOTKEY}), then run the student-experience demo…`);
  console.log("logging in off-camera…");
  await loginToPortal(page); // BEFORE recording — login never shows
  sendHotkey(SS_HOTKEY); // start recording
  await page.bringToFront().catch(() => {});
  for (let t = Math.ceil(SS_COUNTDOWN_MS / 1000); t > 0; t--) {
    process.stdout.write(`\r⏳  recording starts in ${t}…   `);
    await wait(1000);
  }
  process.stdout.write("\r                            \n");
} else {
  await ask("\n▶  Press Enter, then switch to Screen Studio and hit Record — the demo starts after a short countdown…");
  console.log("logging in off-camera…");
  await loginToPortal(page);
  await page.bringToFront().catch(() => {});
  const BUFFER_MS = Number(process.env.BUFFER_MS ?? 4000);
  for (let t = Math.ceil(BUFFER_MS / 1000); t > 0; t--) {
    process.stdout.write(`\r⏳  starting in ${t}…   `);
    await wait(1000);
  }
  process.stdout.write("\r                         \n");
}
await page.bringToFront().catch(() => {});

// SCENES=1 runs just the first scene (the clean single-take). Default: all.
const sceneList = scenes.slice(0, Number(process.env.SCENES ?? scenes.length));
for (const s of sceneList) {
  console.log(`— Scene ${s.n} —`);
  const audio = narrate(s.audio);
  await s.run(page);
  if (audio) await audio;
  else await wait(1200);
}

if (RECORD) {
  await wait(800);
  sendHotkey(SS_HOTKEY); // stop recording
  console.log("\n✓ Demo complete — recording stopped (check Screen Studio).");
} else {
  console.log("\n✓ Demo complete. Stop the recording.");
}
await wait(1500);
await browser.close();
