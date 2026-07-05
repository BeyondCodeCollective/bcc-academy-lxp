// Screenshot every page on the platform map — public pages anonymously,
// student pages as the test students, admin pages as the super-admin — and
// build a contact-sheet gallery (demo/screenshots/index.html).
//
//   node scripts/shot-sitemap.mjs                 # against production
//   node scripts/shot-sitemap.mjs http://localhost:3000
//
// Output: demo/screenshots/*.png (gitignored). Redirects are captured as
// wherever the URL actually lands — that IS the experience for that account.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const ORIGIN = process.argv[2] || "https://bccacademy.io";
const OUT = "demo/screenshots";
mkdirSync(OUT, { recursive: true });

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0) env[l.slice(0, i)] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ACCOUNTS = {
  admin: "fonz.morris@wearebgc.org",       // super-admin — admin engine pages
  camper: "fonz.morris@hey.com",           // BGC camp student (has a certificate)
  student: "youngfonz+fortetest@gmail.com", // Forte student with a STARTED course
};

// [area, name, path, context] — context: anon | student | camper | admin
const SHOTS = [
  ["public", "homepage", "/", "anon"],
  ["public", "landing-bgc-roblox", "/bcc/bgc-roblox", "anon"],
  ["public", "landing-cybersecurity", "/bcc/cybersecurity", "anon"],
  ["public", "landing-game-on", "/bcc/game-on", "anon"],
  ["public", "career-quiz", "/quiz", "anon"],
  ["public", "pathway-explorers", "/pathways/explorers", "anon"],
  ["public", "public-survey", "/survey/bcc-learner-intake", "anon"],
  ["public", "certificate", "/certificate/eac1323b-18ef-40ae-8afd-7f9719400a3d", "anon"],
  ["public", "help", "/help", "anon"],
  ["public", "privacy", "/privacy", "anon"],
  ["public", "terms", "/terms", "anon"],
  ["getting-in", "apply-security-plus", "/apply/security-plus", "anon"],
  ["getting-in", "join-bgc", "/join/bgc", "anon"],
  ["getting-in", "login", "/login", "anon"],
  ["student", "learner-home", "/dashboard", "student"],
  ["student", "course-overview", "/dashboard/track/ai-literacy", "student"],
  ["student", "camp-overview-certificate", "/dashboard/track/roblox-virtual-bootcamp", "camper"],
  ["student", "camp-classroom-day1", "/dashboard/track/roblox-virtual-bootcamp/1", "admin"],
  ["student", "ai-tutor", "/dashboard/tutor", "student"],
  ["student", "course-catalog", "/dashboard/courses", "student"],
  ["student", "workshops", "/dashboard/workshops", "student"],
  ["student", "lunch-learn", "/dashboard/lunch-learn", "student"],
  ["student", "assessment", "/dashboard/assessment", "student"],
  ["student", "agreement", "/dashboard/agreement", "student"],
  ["student", "in-portal-survey", "/dashboard/survey/comptia-security-pre", "student"],
  ["student", "my-analytics", "/dashboard/insights", "student"],
  ["student", "get-started", "/dashboard/start", "student"],
  ["student", "guide", "/dashboard/guide", "student"],
  ["student", "help-center", "/dashboard/help", "student"],
  ["student", "resources", "/dashboard/resources", "student"],
  ["student", "settings", "/dashboard/settings", "student"],
  ["admin", "admin-home", "/dashboard/admin", "admin"],
  ["admin", "survey-insights", "/dashboard/admin/insights", "admin"],
  ["admin", "engagement", "/dashboard/admin?tab=analytics", "admin"],
  ["admin", "registrations", "/dashboard/admin/registrations", "admin"],
  ["admin", "invites", "/dashboard/admin/invites", "admin"],
  ["admin", "manage-courses", "/dashboard/admin/programs", "admin"],
  ["admin", "landing-builder", "/dashboard/admin/landing", "admin"],
  ["admin", "allowlist", "/dashboard/admin/allowlist", "admin"],
  ["admin", "surveys", "/dashboard/admin/surveys", "admin"],
  ["admin", "assessments", "/dashboard/admin/assessments", "admin"],
  ["admin", "agreements", "/dashboard/admin/agreements", "admin"],
  ["admin", "features", "/dashboard/admin/features", "admin"],
  ["admin", "resources-manager", "/dashboard/admin/resources", "admin"],
  ["admin", "platform-map", "/platform-map", "admin"],
];

const browser = await chromium.launch();
const contexts = { anon: await browser.newContext({ viewport: { width: 1440, height: 900 } }) };

/** Sign a context in by minting a magic link and driving the auth callback. */
async function loginContext(name, email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const { data, error } = await svc.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    console.warn(`⚠ could not mint link for ${name} (${email}): ${error.message}`);
    await ctx.close();
    return null;
  }
  const page = await ctx.newPage();
  await page.goto(
    `${ORIGIN}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(email)}`,
    { waitUntil: "load", timeout: 45000 },
  );
  await page.waitForURL(/\/dashboard/, { timeout: 45000 }).catch(() => {});
  const landed = page.url();
  await page.close();
  if (!landed.includes("/dashboard")) {
    console.warn(`⚠ ${name} login did not reach the dashboard (landed on ${landed})`);
    await ctx.close();
    return null;
  }
  console.log(`✓ signed in ${name} (${email})`);
  return ctx;
}

contexts.admin = await loginContext("admin", ACCOUNTS.admin);
contexts.camper = await loginContext("camper", ACCOUNTS.camper);
contexts.student = (await loginContext("student", ACCOUNTS.student)) ?? contexts.camper;

const results = [];
// CSP tripwire: violations are silent by design, so every sweep doubles as a
// CSP regression test. Three embeds (Zoom workers, Zoom scripts, Eventbrite
// checkout) each broke for weeks after enforcement because nothing exercised
// them — this catches the next one on the first run after the mistake.
const cspViolations = [];
let i = 0;
for (const [area, name, path, ctxName] of SHOTS) {
  i++;
  const ctx = contexts[ctxName];
  if (!ctx) {
    console.warn(`SKIP ${name} — no ${ctxName} session`);
    continue;
  }
  const file = `${String(i).padStart(2, "0")}-${area}-${name}.png`;
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (/violates the following Content Security Policy/i.test(m.text())) {
      cspViolations.push({ page: path, message: m.text().slice(0, 180) });
    }
  });
  try {
    await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    results.push({ file, area, name, path, landed: page.url().replace(ORIGIN, "") });
    console.log(`shot ${i}/${SHOTS.length}: ${name} → ${page.url().replace(ORIGIN, "")}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();

// Contact sheet — open demo/screenshots/index.html to flip through everything.
const AREAS = ["public", "getting-in", "student", "admin"];
const gallery = `<!doctype html><meta charset="utf-8"><title>BCC Academy — every page</title>
<body style="margin:0;background:#1a1a1a;color:#fff;font-family:-apple-system,sans-serif;padding:40px">
<h1 style="font-weight:800;letter-spacing:-0.02em">Every page, screenshotted ${new Date().toISOString().slice(0, 10)}</h1>
${AREAS.map((a) => `
<h2 style="margin:36px 0 12px;text-transform:capitalize;color:#1D59FF">${a.replace("-", " ")}</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
${results.filter((r) => r.area === a).map((r) => `
  <a href="${r.file}" target="_blank" style="color:inherit;text-decoration:none;background:#242120;border-radius:12px;overflow:hidden;display:block">
    <img src="${r.file}" loading="lazy" style="width:100%;height:200px;object-fit:cover;object-position:top;display:block">
    <p style="margin:10px 12px 2px;font-size:13px;font-weight:600">${r.name}</p>
    <p style="margin:0 12px 12px;font-size:11px;color:#999;font-family:monospace">${r.landed}</p>
  </a>`).join("")}
</div>`).join("")}
</body>`;
writeFileSync(`${OUT}/index.html`, gallery);
console.log(`\n${results.length} screenshots → ${OUT}/  (open ${OUT}/index.html for the gallery)`);

if (cspViolations.length > 0) {
  console.error(`\n✘ CSP VIOLATIONS on ${new Set(cspViolations.map((v) => v.page)).size} page(s):`);
  for (const v of cspViolations.slice(0, 20)) console.error(`  ${v.page}: ${v.message}`);
  console.error("Fix the allowlist in next.config.ts (see the Eventbrite/Zoom precedents).");
  process.exit(1);
}
console.log("✓ zero CSP violations across the sweep");
