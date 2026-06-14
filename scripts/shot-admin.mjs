import { readFileSync, mkdirSync } from "fs";
import { chromium } from "playwright";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0) env[l.slice(0, i)] = l.slice(i + 1).trim();
}
mkdirSync("/tmp/brand-cards", { recursive: true });
const { createClient } = await import("@supabase/supabase-js");
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await svc.auth.admin.generateLink({
  type: "magiclink", email: "youngfonz@gmail.com",
  options: { redirectTo: "http://localhost:3000/auth/callback" },
});
if (error) { console.error(error.message); process.exit(1); }
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`);
await page.waitForURL(/\/dashboard/, { timeout: 30000 });
for (const [name, url] of [["courses", "http://localhost:3000/dashboard/courses"], ["workshops", "http://localhost:3000/dashboard/workshops"]]) {
  await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/brand-cards/${name}.png` });
  console.log("shot:", name, page.url());
}
await browser.close();
