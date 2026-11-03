import { devices, type Page, type BrowserContext } from "@playwright/test";
import { admin } from "../smoke/helpers/supabase";

export const WRITES = process.env.QA_WRITES === "1";

// Chromium with an iPhone viewport, so mobile checks run in the same browser.
const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
export const PHONE = iphone;

export const ADMIN_EMAIL = "youngfonz@gmail.com"; // super_admin test account
export const PLAIN_ADMIN_EMAIL = "fonz.morris+bgcadmin@wearebgc.org";

/** Sign a page's context in as `email` without an inbox. The app's
 *  /auth/callback verifies token_hash server-side, so build that URL directly. */
export async function loginAs(page: Page, email: string, next?: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);
  const base = new URL(process.env.SMOKE_BASE_URL ?? "https://bccacademy.io");
  // An unconfirmed (never-clicked) account gets a "signup" token, not "magiclink".
  const type = data.properties.verification_type ?? "magiclink";
  const url =
    `${base.origin}/auth/callback?token_hash=${data.properties.hashed_token}` +
    `&type=${type}&email=${encodeURIComponent(email)}` +
    (next ? `&next=${encodeURIComponent(next)}` : "");
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

export async function noSideScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

export async function newPhoneContext(browser: import("@playwright/test").Browser): Promise<BrowserContext> {
  return browser.newContext({ ...PHONE, baseURL: process.env.SMOKE_BASE_URL ?? "https://bccacademy.io" });
}
