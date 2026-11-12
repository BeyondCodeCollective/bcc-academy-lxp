import { test, expect } from "./support/test";
import { auditPage, watch } from "./support/helpers";

const PAGES: [string, string, number?][] = [
  ["apex landing", "/"],
  ["login", "/login"],
  ["campaign landing", "/bcc/e2e-landing"],
  ["generic apply", "/apply/e2e-open-app"],
  ["apply security-plus", "/apply/security-plus"],
  ["apply home-for-summer", "/apply/home-for-summer"],
  ["apply sbft (closed)", "/apply/sbft"],
  ["public survey", "/survey/ai-fundamentals"],
  ["help", "/help"],
  ["privacy", "/privacy"],
  ["privacy withdraw", "/privacy/withdraw"],
  ["terms", "/terms"],
  ["quiz", "/quiz"],
  ["404", "/definitely-not-a-page", 404],
  ["events", "/events"],
];

test.describe("public pages render clean", () => {
  for (const [label, url, status] of PAGES) {
    test(label, async ({ page }, info) => {
      await auditPage(page, url, info, { expectStatus: status, label });
    });
  }
});

test.describe("login form", () => {
  test("renders, submit disabled when empty or invalid", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("Email address");
    await expect(email).toBeVisible();
    const submit = page.locator("form button[type=submit]").first();
    await expect(submit).toBeDisabled();
    await email.fill("not-an-email");
    await expect(submit).toBeDisabled();
    await email.fill("someone@example.test");
    await expect(submit).toBeEnabled();
  });

  test("email not on the invite list gets a clear message, not an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("stranger@example.test");
    await page.locator("form button[type=submit]").first().click();
    await expect(page.getByRole("alert").filter({ hasText: /invite list/i })).toBeVisible({ timeout: 20000 });
  });

  test("invited email reaches the code step; code field validates length", async ({ page }) => {
    // The stub accepts the OTP call; no Resend key is set so no mail can go out.
    await page.goto("/login");
    await page.getByLabel("Email address").fill("invited@example.test");
    await page.locator("form button[type=submit]").first().click();
    const code = page.getByLabel("Sign-in code");
    await expect(code).toBeVisible({ timeout: 20000 });
    const btn = page.locator("form").filter({ has: code }).locator("button[type=submit]");
    await expect(btn).toBeDisabled();
    await code.fill("12");
    await expect(btn).toBeDisabled();
    await code.fill("123456");
    await expect(btn).toBeEnabled();
  });
});

test.describe("apply forms", () => {
  test("generic apply: required validation + double submit sends one action", async ({ page }) => {
    const w = watch(page);
    await page.goto("/apply/e2e-open-app");
    const submit = page.getByRole("button", { name: /submit application/i });
    await expect(submit).toBeDisabled(); // required fields empty
    await page.locator("#apply-name").fill("Test Person");
    await page.locator("#apply-email").fill("test.person@example.test");
    await page.getByLabel(/why do you want/i).fill("Because testing.");
    await expect(submit).toBeEnabled();
    let actionPosts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.headers()["next-action"]) actionPosts++; });
    await submit.dblclick({ delay: 0 });
    await page.waitForTimeout(2500);
    expect(actionPosts, "server action POSTs after a double click").toBe(1);
    expect(w.pageErrors).toEqual([]);
  });

  test("security-plus form renders with required fields", async ({ page }) => {
    await page.goto("/apply/security-plus");
    await expect(page.locator("form")).toBeVisible();
    const submit = page.locator("form button[type=submit]").first();
    await expect(submit).toBeVisible();
    if (await submit.isEnabled()) {
      await submit.click();
      // an empty submit must not navigate away or crash
      await expect(page).toHaveURL(/apply\/security-plus/);
    }
  });
});

test("unknown apply slug is a 404 not a 500", async ({ request }) => {
  const r = await request.get("/apply/nope-nope", { maxRedirects: 0 });
  expect(r.status()).toBe(404);
});
