import { expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { USERS, sessionCookie } from "./fixtures.mjs";

export type UserKey = "student" | "future" | "empty" | "instructor" | "admin" | "super";
const BASE = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3100}`;

/** Put a fake Supabase session cookie (honoured by the local stub) on the context. */
export async function loginAs(context: BrowserContext, key: UserKey, opts: { program?: string; preview?: string } = {}) {
  const u = USERS.find((x: { key: string }) => x.key === key);
  const c = sessionCookie(u);
  const cookies = [{ name: c.name, value: c.value, url: BASE }];
  if (opts.program) cookies.push({ name: "program-override", value: opts.program, url: BASE });
  if (opts.preview) cookies.push({ name: "preview-as-student", value: opts.preview, url: BASE });
  await context.addCookies(cookies);
}

/** Collects uncaught page errors, console errors and failed same-origin requests. */
export function watch(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("response", (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
  return { pageErrors, consoleErrors, failed };
}

const OUT = path.join(process.cwd(), "test-results", "audit");
export function record(kind: "console" | "a11y" | "overflow" | "images", entry: Record<string, unknown>) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(path.join(OUT, `${kind}.jsonl`), JSON.stringify(entry) + "\n");
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
}

export async function brokenImages(page: Page) {
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src) && getComputedStyle(i).display !== "none" && i.loading !== "lazy")
      .map((i) => i.currentSrc || i.src),
  );
}

const AXE = process.env.E2E_AXE_PATH || "/private/tmp/claude-505/-Users-fonz-morris-dev-bcc-lxp-audit/c6b3a423-f5b8-4ad3-90f3-81f91bc82c88/scratchpad/axe.min.js";
/** Run axe (WCAG 2.x A/AA) and record violations. Never fails the test. */
export async function runAxe(page: Page, label: string, info: TestInfo) {
  if (!fs.existsSync(AXE)) return;
  try {
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(async () => {
      // @ts-expect-error injected global
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, example: v.nodes[0]?.target?.join(" ") }));
    });
    record("a11y", { label, project: info.project.name, url: page.url().replace(BASE, ""), violations: res });
  } catch (e) {
    record("a11y", { label, project: info.project.name, error: String(e).slice(0, 120) });
  }
}

/** Standard public-page checks: status, errors, overflow, images, axe. */
export async function auditPage(page: Page, url: string, info: TestInfo, opts: { expectStatus?: number; label?: string } = {}) {
  const w = watch(page);
  const resp = await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const label = opts.label ?? url;
  if (opts.expectStatus !== undefined) expect(resp?.status(), `${label} status`).toBe(opts.expectStatus);
  else expect(resp?.status(), `${label} status`).toBeLessThan(400);
  const ov = await horizontalOverflow(page);
  const imgs = await brokenImages(page);
  record("console", { label, project: info.project.name, pageErrors: w.pageErrors, consoleErrors: w.consoleErrors, failed: w.failed });
  record("overflow", { label, project: info.project.name, ...ov });
  if (imgs.length) record("images", { label, project: info.project.name, imgs });
  await runAxe(page, label, info);
  expect(w.pageErrors, `${label} uncaught page errors`).toEqual([]);
  expect(ov.scrollWidth, `${label} horizontal overflow`).toBeLessThanOrEqual(ov.innerWidth);
  expect(imgs, `${label} broken images`).toEqual([]);
  return w;
}
