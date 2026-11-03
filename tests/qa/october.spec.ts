import { test, expect } from "@playwright/test";
import { SMOKE_ENV_READY, SMOKE_ENV_REASON } from "../smoke/helpers/supabase";
import { ADMIN_EMAIL, PLAIN_ADMIN_EMAIL, PHONE, loginAs, newPhoneContext, noSideScroll } from "./helpers";

// READ-ONLY regression suite. Nothing here creates, edits or deletes a row.
// Write tests live in writes.spec.ts (QA_WRITES=1). Test names start with the
// checklist number so results map 1:1.
test.skip(!SMOKE_ENV_READY, SMOKE_ENV_REASON);

const BASE = process.env.SMOKE_BASE_URL ?? "https://bccacademy.io";

const hasField = (page: import("@playwright/test").Page, re: RegExp) =>
  page.getByLabel(re).or(page.getByPlaceholder(re)).or(page.getByRole("combobox", { name: re })).count();

test.describe("2. Landing pages (public, read only)", () => {
  test.use({ ...PHONE });

  test("2.3 age and ZIP: staff cohort hides both", async ({ page }) => {
    await page.goto("/field-ready/field-ready-staff-cohort");
    await expect(page.locator("form").first()).toBeVisible();
    expect(await hasField(page, /zip|postal/i)).toBe(0);
    expect(await hasField(page, /age|how old|birth/i)).toBe(0);
  });

  test("2.3 age and ZIP: Catalyst Labs shows age range", async ({ page }) => {
    await page.goto("/bcc/catalyst-labs");
    await expect(page.locator("form").first()).toBeVisible();
    expect(await hasField(page, /age/i)).toBeGreaterThan(0);
  });

  test("2.3 age and ZIP: South Fulton shows age range", async ({ page }) => {
    await page.goto("/beyond-code-centers/field-ready-south-fulton");
    expect(await hasField(page, /age/i)).toBeGreaterThan(0);
  });

  test("2.4 form position (info: prints form top vs hero)", async ({ page }) => {
    await page.goto("/bcc/catalyst-labs");
    const y = await page.locator("form").first().evaluate((el) => el.getBoundingClientRect().top + scrollY);
    console.log(`2.4 INFO catalyst-labs form top = ${Math.round(y)}px of ${await page.evaluate(() => document.body.scrollHeight)}px`);
    expect(y).toBeGreaterThan(0);
  });

  test("2.5 event landing page renders, Register present, fits phone", async ({ page }) => {
    await page.goto("/bgc/bgc-zztest");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /register/i }).or(page.getByRole("link", { name: /register/i })).first()).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
  });

  for (const path of ["/bcc/catalyst-labs", "/field-ready/field-ready-staff-cohort", "/events"]) {
    test(`2.7 no sideways scroll on ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await noSideScroll(page)).toBe(true);
    });
  }
});

test.describe("4. Events and 6. Surveys (public, read only)", () => {
  test.use({ ...PHONE });

  test("4.1 /events lists events, no login", async ({ page }) => {
    const res = await page.goto("/events");
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).not.toMatch(/login/);
  });

  test("4.1 zz-test-event register page loads with no login", async ({ page }) => {
    const res = await page.goto("/events/zz-test-event/register");
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).not.toMatch(/login/);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("6.1 AI Fundamentals post survey opens without login", async ({ page }) => {
    const res = await page.goto("/survey/ai-fundamentals-post-2026");
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).not.toMatch(/login/);
    await expect(page.locator("form, [role=form], input, textarea").first()).toBeVisible();
  });
});

test.describe("3/7. Admin pages as super_admin (read only)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
  });

  for (const [n, path] of [
    ["3.1", "/dashboard/admin/landing-signups"],
    ["2.7", "/dashboard/admin/landing"],
    ["4.0", "/dashboard/admin/events"],
    ["3.3", "/dashboard/admin/applications"],
    ["6.2", "/dashboard/admin/features"],
    ["7.1", "/dashboard/admin/mvp"],
  ] as const) {
    test(`${n} admin page loads: ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      expect(page.url()).toContain(path);
      await expect(page.getByText(/something went wrong|application error|500/i)).toHaveCount(0);
    });
  }

  test.describe("on a phone", () => {
    test.use({ ...PHONE });
    for (const [n, path] of [
      ["3.4", "/dashboard/admin"],
      ["3.4", "/dashboard/admin/events"],
      ["2.7", "/dashboard/admin/landing"],
      ["2.7", "/dashboard/admin/landing-signups"],
    ] as const) {
      test(`${n} no sideways scroll: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await noSideScroll(page)).toBe(true);
      });
    }
  });

  test("2.7 landing admin groups collapse", async ({ page }) => {
    await page.goto("/dashboard/admin/landing");
    const pub = page.locator("details", { hasText: "Published" }).first();
    await expect(pub).toHaveJSProperty("open", true);
    await pub.locator("summary").click();
    await expect(pub).toHaveJSProperty("open", false);
  });

  test("3.1 signups: pick Catalyst Labs, Session column and filter appear", async ({ page }) => {
    await page.goto("/dashboard/admin/landing-signups?course=catalyst-labs");
    await expect(page.getByText(/session/i).first()).toBeVisible();
    await expect(page.getByText(/All \(\d+\)/)).toBeVisible();
  });

  test("3.2 signups CSV download has the right header", async ({ page }) => {
    await page.goto("/dashboard/admin/landing-signups?course=catalyst-labs");
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /download csv/i }).or(page.getByRole("link", { name: /download csv/i })).first().click(),
    ]);
    const text = await (await import("node:fs/promises")).readFile(await dl.path(), "utf8");
    const header = text.split("\n")[0];
    for (const col of ["Name", "Email", "Session", "Signed up", "Heard about", "Status"]) expect(header).toContain(col);
  });

  test("4.0 zz-test-event is listed in admin events", async ({ page }) => {
    await page.goto("/dashboard/admin/events");
    await expect(page.getByText(/ZZ test event/i).first()).toBeVisible();
  });
});

// Access: /dashboard/admin/mvp is narrowed to super_admin; a plain admin is sent to /dashboard.
test("7.1 plain admin is redirected away from the MVP dashboard", async ({ page }) => {
  await loginAs(page, PLAIN_ADMIN_EMAIL);
  await page.goto("/dashboard/admin/mvp");
  await page.waitForLoadState("networkidle");
  expect(new URL(page.url()).pathname).not.toBe("/dashboard/admin/mvp");
});

test("7.1 super admin can open the MVP dashboard", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL);
  await page.goto("/dashboard/admin/mvp");
  expect(new URL(page.url()).pathname).toBe("/dashboard/admin/mvp");
  await expect(page.getByRole("heading", { name: /impact overview/i })).toBeVisible();
});

test.describe("Signed-out redirects", () => {
  for (const path of ["/dashboard", "/dashboard/admin", "/dashboard/admin/mvp", "/dashboard/admin/events"]) {
    test(`${path} sends a signed-out visitor to login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toMatch(/login|auth/);
    });
  }
});

test.describe("Survey links (read only)", () => {
  test("6.2 Features page lists survey links", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard/admin/features");
    await page.waitForLoadState("networkidle");
    expect(/survey (&|and) form links/i.test(await page.locator("body").innerText())).toBe(true);
  });

  test("6.2 MASS survey link requires login and returns after", async ({ browser }) => {
    const actx = await browser.newContext({ baseURL: BASE });
    const ap = await actx.newPage();
    await loginAs(ap, ADMIN_EMAIL);
    await ap.goto("/dashboard/admin/features");
    const hrefs = await ap.locator("a[href*='survey']").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    await actx.close();
    const mass = [...new Set(hrefs)].find((h) => /mass/i.test(h));
    test.skip(!mass, "no MASS survey link is listed on the Features page");
    const ctx = await newPhoneContext(browser);
    const page = await ctx.newPage();
    const res = await page.goto(mass!);
    expect(res?.status()).toBeLessThan(400);
    // Authenticated survey: a signed-out visitor lands on login and is sent back after.
    expect(page.url()).toMatch(/login/);
    expect(decodeURIComponent(page.url())).toMatch(/survey/);
    await ctx.close();
  });

  test("3.3 Security+ application opens signed out (not submitted)", async ({ browser }) => {
    const ctx = await newPhoneContext(browser);
    const page = await ctx.newPage();
    const res = await page.goto("/apply/security-plus");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("button", { name: /start application/i })).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
    await ctx.close();
  });
});

test.describe("Admin editors and check-in (read only)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
  });

  test("2.6 landing editor shows a library picker for the hero", async ({ page }) => {
    await page.goto("/dashboard/admin/landing");
    const group = page.locator("details", { hasText: "Drafts" });
    await group.locator("summary").click().catch(() => {});
    const href = await group.locator("a[href^='/dashboard/admin/landing/']").first().getAttribute("href");
    test.skip(!href, "no draft landing page exists to open");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /choose from library/i }).first()).toBeVisible();
  });

  test("4.3 staff check-in screen loads on a phone and has search", async ({ browser }) => {
    const ctx = await newPhoneContext(browser);
    const page = await ctx.newPage();
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard/admin/events");
    const href = await page.locator("a[href^='/dashboard/admin/events/']").evaluateAll((as) =>
      (as as HTMLAnchorElement[]).map((a) => a.getAttribute("href")!).find((h) => /^\/dashboard\/admin\/events\/[0-9a-f-]{36}$/.test(h)));
    test.skip(!href, "no event is listed in admin events");
    const res = await page.goto(`${href}/check-in`);
    expect(res?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");
    expect(await noSideScroll(page)).toBe(true);
    await expect(page.getByRole("searchbox").or(page.getByPlaceholder(/search|name|email/i)).first()).toBeVisible();
    await ctx.close();
  });
});
