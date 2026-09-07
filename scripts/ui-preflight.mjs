// Pre-launch UI sweep: screenshot routes at phone / tablet / desktop widths and
// flag the mechanical failures (horizontal overflow, elements crossing the
// viewport edge, broken images). The screenshots are the real deliverable —
// review every one for clipped text, cramped dropdowns, and overlap.
//
//   node scripts/ui-preflight.mjs [--email you@x.com] [--base http://localhost:3001] /route [/route ...]
//
// With --email it signs in via an admin-minted magic link (Supabase service
// key from .env.local), so authenticated dashboard routes render for real.
// Screenshots land in /tmp/ui-preflight/<route>@<width>.png.
import { readFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];
const OUT = "/tmp/ui-preflight";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const args = process.argv.slice(2);
let base = "http://localhost:3001";
let email = null;
const routes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base") base = args[++i];
  else if (args[i] === "--email") email = args[++i];
  else routes.push(args[i]);
}
if (!routes.length) {
  console.error("usage: node scripts/ui-preflight.mjs [--email x] [--base url] /route ...");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const findings = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    // Real device flags so mobile CSS + touch styling actually engage.
    ...(vp.name === "phone" ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await context.newPage();

  if (email) {
    const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const { data, error } = await svc.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw error;
    await page.goto(
      `${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(email)}`,
    );
    await page.waitForURL(/\/dashboard|\/login/, { timeout: 30000 });
    if (page.url().includes("/login")) throw new Error(`sign-in failed for ${email}`);
  }

  for (const route of routes) {
    const slug = route.replace(/^\//, "").replace(/[^a-z0-9-]+/gi, "_") || "home";
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(800);

    const checks = await page.evaluate(() => {
      const issues = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > window.innerWidth + 1) {
        issues.push(`horizontal overflow: page is ${doc.scrollWidth}px wide in a ${window.innerWidth}px viewport`);
      }
      const inScrollContainer = (el) => {
        for (let a = el.parentElement; a; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).overflowX !== "hidden" && !inScrollContainer(el)) {
          const tag = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].slice(0, 3).join(".")}`;
          issues.push(`element crosses right edge: ${tag} (right=${Math.round(r.right)})`);
          if (issues.length > 12) break; // one bad container cascades; cap the noise
        }
      }
      for (const img of document.querySelectorAll("img")) {
        if (img.complete && img.naturalWidth === 0) issues.push(`broken image: ${img.src.slice(0, 120)}`);
      }
      return issues;
    });

    // Full-page shot so below-the-fold problems are captured too.
    const file = `${OUT}/${slug}@${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`shot ${route} @ ${vp.name} (${vp.width}px) -> ${file}`);
    for (const issue of checks) {
      findings.push(`[${vp.name} ${route}] ${issue}`);
      console.log(`  ⚠ ${issue}`);
    }
  }
  await context.close();
}
await browser.close();

console.log(
  findings.length
    ? `\n${findings.length} mechanical finding(s) above. Now REVIEW EVERY SCREENSHOT in ${OUT} for clipped text, dropdowns, overlap.`
    : `\nNo mechanical findings. Still REVIEW EVERY SCREENSHOT in ${OUT} — clipped text and ugly dropdowns don't trip automated checks.`,
);
