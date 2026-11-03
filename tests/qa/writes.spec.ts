/**
 * WRITE tests. Skipped unless QA_WRITES=1. These hit whatever SMOKE_BASE_URL
 * points at (default production), so read this first.
 *
 * PRECONDITIONS
 *  - Run only after the read-only suite (october.spec.ts) is green.
 *  - SMOKE_SUPABASE_URL and SMOKE_SUPABASE_SERVICE_ROLE_KEY are set.
 *  - The Meta Pixel is blocked in every context, so test signups never reach ads.
 *  - Event tests look up the event with slug "zz-test-event" at runtime and skip
 *    if it does not exist. Nothing here hardcodes row ids.
 *  - Run phase A before phase B: npx playwright test -c playwright.qa.config.ts writes --grep @A
 *    then --grep @B.
 *
 * PROD ROWS CREATED (all use youngfonz+qa1..6@gmail.com)
 *  - auth.users and students for qa2, qa3, qa4 (created by landing signup + sign in)
 *  - landing_signups for qa2, qa3, qa4, qa5 (staff cohort and Catalyst Labs)
 *  - student_tracks and allowed_signup_emails rows for the staff cohort signups
 *  - event_registrations and event_attendees for qa1..3 on zz-test-event
 *  - public_survey_responses for the AI Fundamentals post survey and security-plus-application (qa6)
 *  - events.hidden_questions on zz-test-event is toggled and restored by the test (4.5)
 *  - event_attendees.status / checked_in_at flipped and flipped back (4.3)
 *
 * CLEANUP: nothing deletes data. After a run, a human must write the cleanup
 * SQL list (select first, then delete by exact ids or +qa emails), show it, and
 * get approval before running it. Never automate the deletes.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { admin, SMOKE_ENV_READY, SMOKE_ENV_REASON } from "../smoke/helpers/supabase";
import { ADMIN_EMAIL, PHONE, WRITES, loginAs, noSideScroll } from "./helpers";

test.skip(!SMOKE_ENV_READY, SMOKE_ENV_REASON);
test.skip(!WRITES, "set QA_WRITES=1 to run tests that write to production");

const BASE = process.env.SMOKE_BASE_URL ?? "https://bccacademy.io";
const EVENT_SLUG = "zz-test-event";

/** Look the test event up at runtime; skip the test if it is gone. */
async function eventId(): Promise<string> {
  const { data } = await admin().from("events").select("id").eq("slug", EVENT_SLUG).maybeSingle();
  test.skip(!data?.id, `event ${EVENT_SLUG} does not exist`);
  return data!.id as string;
}

//    phase B (@B) runs after the approved SQL (qa2 allowlist delete, is_test flag).
const qa = (n: number) => `youngfonz+qa${n}@gmail.com`;

// Block the Meta Pixel so test signups never reach the ad account.
const blockPixel = (ctx: import("@playwright/test").BrowserContext) =>
  ctx.route(/facebook\.(com|net)|fbcdn\.net/, (r) => r.abort());

const phoneCtx = async (browser: Browser) => {
  const ctx = await browser.newContext({ ...PHONE, baseURL: BASE });
  await blockPixel(ctx);
  return ctx;
};

async function landingSignup(page: Page, path: string, email: string, opts: { dateText?: RegExp; first?: string } = {}) {
  await page.goto(path);
  const form = page.locator("form").filter({ has: page.locator("input[type=email]") }).first();
  await form.scrollIntoViewIfNeeded();
  const dateSel = form.locator("select").first();
  if (opts.dateText) await dateSel.selectOption({ label: (await dateSel.locator("option").allTextContents()).find((t) => opts.dateText!.test(t))! });
  const texts = form.locator("input[type=text]");
  await texts.nth(0).fill(opts.first ?? "QA");
  await texts.nth(1).fill("Tester");
  await form.locator("input[type=email]").fill(email);
  const n = await texts.count();
  if (n > 2) await texts.nth(2).fill("94612");
  for (const sel of await form.locator("select").all()) {
    const label = await sel.evaluate((e: HTMLSelectElement) => e.labels?.[0]?.innerText ?? "");
    if (/date/i.test(label)) continue;
    if ((await sel.inputValue()) === "") await sel.selectOption({ index: 1 });
  }
  await form.locator("button[type=submit]").click();
  await page.waitForLoadState("networkidle");
}

async function rowCount(table: string, col: string, val: string) {
  const { count } = await admin().from(table).select("*", { count: "exact", head: true }).ilike(col, val);
  return count ?? 0;
}

async function walkWizard(page: Page, done: RegExp) {
  for (let i = 0; i < 40; i++) {
    if (await page.getByText(done).first().isVisible().catch(() => false)) return true;
    for (const el of await page.locator("input:visible, textarea:visible, select:visible").all()) {
      const type = (await el.getAttribute("type")) ?? "";
      const tag = await el.evaluate((e) => e.tagName.toLowerCase());
      if (["hidden", "submit", "file", "button"].includes(type)) continue;
      if (type === "email") await el.fill(qa(6));
      else if (type === "radio" || type === "checkbox") await el.check({ force: true }).catch(() => {});
      else if (tag === "select") await el.selectOption({ index: 1 }).catch(() => {});
      else if (type === "date") await el.fill("2000-01-01");
      else if (type === "tel") await el.fill("5105550100");
      else if (type === "number") await el.fill("5");
      else if (type === "url") await el.fill("https://example.com");
      else if (!(await el.inputValue())) await el.fill("QA Tester");
    }
    // Likert rows (1 to 5 buttons): answer every visible row with 4.
    for (const b of await page.locator("button").filter({ hasText: /^4$/ }).all()) await b.click().catch(() => {});
    const btn = page.getByRole("button", { name: /^(next|submit|start application|finish|send|continue|done)/i }).last();
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click().catch(() => {});
    await page.waitForTimeout(900);
  }
  console.log(`wizard stuck at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 2500).replace(/\n/g, " | ")}`);
  return false;
}
test.describe("phase A: create", () => {
  test("1.3 + 1.4 staff cohort signup enrolls qa4 and lands in the course @A", async ({ browser }) => {
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    if ((await rowCount("landing_signups", "email", qa(4))) === 0) {
      await landingSignup(page, "/field-ready/field-ready-staff-cohort", qa(4));
      await page.waitForTimeout(3000);
    }
    expect(await rowCount("landing_signups", "email", qa(4))).toBeGreaterThan(0);
    await loginAs(page, qa(4));
    expect(page.url()).not.toMatch(/login|not-invited/);
    await ctx.close();
  });

  test("1.6 setup: qa3 signs up (link not opened) @A", async ({ browser }) => {
    const ctx = await phoneCtx(browser);
    await landingSignup(await ctx.newPage(), "/field-ready/field-ready-staff-cohort", qa(3));
    await new Promise((r) => setTimeout(r, 3000));
    expect(await rowCount("landing_signups", "email", qa(3))).toBeGreaterThan(0);
    await ctx.close();
  });

  test("2.1 Catalyst Labs signup for qa5 keeps one row on repeat submit @A", async ({ browser }) => {
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    // Pick the first offered date; the offered dates change over time.
    await landingSignup(page, "/bcc/catalyst-labs", qa(5));
    await page.waitForTimeout(3000);
    await landingSignup(page, "/bcc/catalyst-labs", qa(5));
    await page.waitForTimeout(3000);
    expect(await rowCount("landing_signups", "email", qa(5))).toBe(1);
    await ctx.close();
  });

  test("4.1 + 4.2 three parents race for the seats @A", async ({ browser }) => {
    const id = await eventId();
    const { data: ev } = await admin().from("events").select("capacity").eq("id", id).single();
    const seats = (ev as any)?.capacity as number | null;
    test.skip(!seats || seats >= 3, "needs an event with capacity below 3 to prove the waitlist");
    const ctxs = await Promise.all([1, 2, 3].map(() => phoneCtx(browser)));
    const pages = await Promise.all(ctxs.map((c) => c.newPage()));
    await Promise.all(pages.map((p) => p.goto(`/events/${EVENT_SLUG}/register`)));
    for (const [i, p] of pages.entries()) {
      await p.getByLabel(/^First name/).nth(0).fill(`QA${i + 1}`);
      await p.getByLabel(/^Last name/).nth(0).fill("Parent");
      await p.getByLabel(/^Email/).fill(qa(i + 1));
      await p.getByLabel(/^First name/).nth(1).fill(`Kid${i + 1}`);
      await p.getByLabel(/^Last name/).nth(1).fill("Parent");
      await p.getByLabel(/Date of birth/).fill("2012-05-05");
      for (const sel of await p.locator("select").all()) {
        if (await sel.evaluate((e: HTMLSelectElement) => e.required)) await sel.selectOption({ index: 1 });
      }
    }
    await Promise.all(pages.map((p) => p.getByRole("button", { name: /^register/i }).click()));
    await Promise.all(pages.map((p) => p.waitForLoadState("networkidle")));
    await pages[0].waitForTimeout(3000);
    const { data } = await admin().from("event_attendees").select("status, event_registrations(parent_email)").eq("event_id", id);
    const mine = (data ?? []).filter((r: any) => /^youngfonz\+qa[123]@/i.test(r.event_registrations?.parent_email ?? ""));
    const waitlisted = mine.filter((r: any) => /wait/i.test(r.status)).length;
    expect(mine.length).toBe(3);
    expect(mine.length - waitlisted).toBe(seats);
    await Promise.all(ctxs.map((c) => c.close()));
  });

  test("6.1 AI Fundamentals post survey submits @A", async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    await page.goto("/survey/ai-fundamentals-post-2026");
    expect(await walkWizard(page, /thank/i)).toBe(true);
    await ctx.close();
  });

  test("3.3 application submit (qa6, no accept) @A", async ({ browser }) => {
    test.setTimeout(240_000);
    const rows = async () =>
      (await admin().from("public_survey_responses").select("id").eq("survey_type", "security-plus-application").ilike("email", qa(6))).data ?? [];
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    await page.goto("/apply/security-plus");
    await page.getByRole("textbox").first().fill(qa(6));
    await page.getByRole("button", { name: /start application/i }).click();
    await walkWizard(page, /thank you|you'?re all set|application (has been )?(received|submitted)|we'?ll be in touch/i);
    await page.waitForTimeout(2000);
    expect((await rows()).length).toBe(1);
    await ctx.close();
  });
});

test.describe("phase B: use the accounts phase A created", () => {
  test("1.6 wrong-account link then Sign out and continue (qa3) @B", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE });
    await blockPixel(ctx);
    const page = await ctx.newPage();
    await loginAs(page, ADMIN_EMAIL);
    const { data } = await admin().auth.admin.generateLink({ type: "magiclink", email: qa(3) });
    await page.goto(
      `/auth/callback?token_hash=${data?.properties?.hashed_token}&type=${data?.properties?.verification_type ?? "magiclink"}&email=${encodeURIComponent(qa(3))}`,
    );
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/different account/i)).toBeVisible();
    await page.getByRole("button", { name: /sign out and continue/i }).or(page.getByRole("link", { name: /sign out and continue/i })).click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toMatch(/login/);
    await ctx.close();
  });

  test("1.4 ZIP/birthday prompt: Not now snoozes it (qa4) @B", async ({ browser }) => {
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    await loginAs(page, qa(4));
    await page.goto("/dashboard");
    const modal = page.getByText(/a couple quick details/i);
    const shown = await modal.isVisible().catch(() => false);
    const welcome = page.getByRole("button", { name: /let'?s go/i });
    if (await welcome.isVisible().catch(() => false)) await welcome.click();
    test.skip(!shown, "prompt not shown for this account");
    await page.getByRole("button", { name: /not now/i }).click();
    for (const path of ["/dashboard", "/dashboard/track/field-ready-staff-cohort", "/dashboard"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(modal).toHaveCount(0);
    }
    await ctx.close();
  });

  test("5.2 assessment opens for qa4 on a phone @B", async ({ browser }) => {
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    await loginAs(page, qa(4));
    await page.goto("/dashboard");
    const res = await page.goto("/dashboard/assessment");
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/dashboard/assessment");
    expect(await noSideScroll(page)).toBe(true);
    await ctx.close();
  });

  test("4.4 QR self check-in: wrong email then right email @B", async ({ browser }) => {
    const id = await eventId();
    const { data } = await admin().from("event_attendees").select("status, event_registrations(parent_email)").eq("event_id", id);
    const seated = (data ?? []).find((r: any) => !/wait/i.test(r.status) && /^youngfonz\+qa/i.test(r.event_registrations?.parent_email ?? ""));
    const email = (seated as any)?.event_registrations?.parent_email as string | undefined;
    test.skip(!email, "no seated +qa attendee; run phase A first");
    const actx = await browser.newContext({ baseURL: BASE });
    const apage = await actx.newPage();
    await loginAs(apage, ADMIN_EMAIL);
    await apage.goto(`/dashboard/admin/events/${id}/qr`);
    await apage.waitForLoadState("networkidle");
    const html = await apage.content();
    const url = html.match(/https?:\/\/[^"'\s<\\]*\/events\/check-in\/[^"'\s<\\]+/)?.[0] ?? html.match(/\/events\/check-in\/[^"'\s<\\]+/)?.[0];
    expect(url).toBeTruthy();
    await actx.close();
    const ctx = await phoneCtx(browser);
    const page = await ctx.newPage();
    await page.goto(url!);
    await page.getByRole("textbox").first().fill("nobody@example.com");
    await page.getByRole("button", { name: /find|continue|next|check|here|look/i }).first().click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox").first().fill(email!);
    await page.getByRole("button", { name: /find|continue|next|check|here|look/i }).first().click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("checkbox").first().check().catch(() => {});
    await page.getByRole("button", { name: /i'?m here/i }).click();
    await page.waitForLoadState("networkidle");
    const { data: after } = await admin().from("event_attendees").select("checked_in_at").eq("event_id", id).not("checked_in_at", "is", null);
    expect((after ?? []).length).toBeGreaterThan(0);
    await ctx.close();
  });
});

test("4.5 toggle School name off, see it gone on both forms, restore", async ({ browser }) => {
  test.setTimeout(150_000);
  const id = await eventId();
  const hiddenNow = async () => (await admin().from("events").select("hidden_questions").eq("id", id).single()).data?.hidden_questions as string[];
  const before = await hiddenNow();
  test.skip(before.includes("school_name"), "school_name is already hidden; nothing to toggle safely");
  const ctx = await browser.newContext({ baseURL: BASE });
  await blockPixel(ctx);
  const page = await ctx.newPage();
  await loginAs(page, ADMIN_EMAIL);
  const edit = `/dashboard/admin/events/${id}/edit`;
  const box = () => page.locator("label", { hasText: /^\s*School name\s*$/ }).locator("input[type=checkbox]");
  try {
    await page.goto(edit);
    await box().uncheck();
    await page.getByRole("button", { name: /save changes/i }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(await hiddenNow()).toEqual(expect.arrayContaining(["school_name"]));
    await page.goto(`/events/${EVENT_SLUG}/register`);
    await page.waitForLoadState("networkidle");
    expect(await page.getByLabel(/school name/i).count()).toBe(0);
  } finally {
    await page.goto(edit);
    await box().check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }
  expect(await hiddenNow()).toEqual(before);
  await ctx.close();
});

test("4.3 staff tap marks a +qa attendee attended, second tap undoes", async ({ browser }) => {
  test.setTimeout(150_000);
  const id = await eventId();
  const { data } = await admin().from("event_attendees").select("id, first_name, event_registrations(parent_email)").eq("event_id", id);
  const target = (data ?? []).find((r: any) => /^youngfonz\+qa/i.test(r.event_registrations?.parent_email ?? "")) as any;
  test.skip(!target, "no +qa attendee on the event; run phase A first");
  const row = async () => (await admin().from("event_attendees").select("status, checked_in_at").eq("id", target.id).single()).data;
  const start = await row();
  test.skip(start?.status !== "confirmed", "attendee is not in the confirmed state; undo target would be wrong");
  const ctx = await phoneCtx(browser);
  const page = await ctx.newPage();
  await loginAs(page, ADMIN_EMAIL);
  await page.goto(`/dashboard/admin/events/${id}/check-in`);
  await page.waitForLoadState("networkidle");
  const tap = () => page.getByRole("button", { name: new RegExp(target.first_name) }).first().click();
  try {
    await tap();
    await page.waitForTimeout(2500);
    const on = await row();
    expect(on?.status).toBe("attended");
    expect(on?.checked_in_at).toBeTruthy();
  } finally {
    if ((await row())?.status === "attended") {
      await tap();
      await page.waitForTimeout(2500);
    }
  }
  const off = await row();
  expect(off?.status).toBe("confirmed");
  expect(off?.checked_in_at).toBeNull();
  await ctx.close();
});
