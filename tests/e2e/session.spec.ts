import { test, expect } from "./support/test";
import { loginAs, watch } from "./support/helpers";
import { fakeJwt } from "./support/fixtures.mjs";

test("expired session: clearing cookies mid-journey lands on /login without an error page", async ({ page, context }) => {
  await loginAs(context, "student");
  const w = watch(page);
  await page.goto("/dashboard/track/mass");
  await expect(page.getByRole("heading", { name: /MASS Wraparound/i })).toBeVisible();
  await context.clearCookies();
  // client-side nav first, then a hard nav
  await page.goto("/dashboard/track/mass/1");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Ftrack%2Fmass%2F1/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByText(/Application error|Internal Server Error|Something went wrong/i)).toHaveCount(0);
  expect(w.pageErrors).toEqual([]);
});

test("garbage auth cookie is treated as logged out, not a 500", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sb-localhost-auth-token", value: "base64-%%%not-json", url: baseURL! }]);
  const r = await page.goto("/dashboard");
  expect(r?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/login/);
});

test("a well-formed token the auth server does not know is treated as logged out", async ({ page, context, baseURL }) => {
  const tok = fakeJwt("99999999-0000-4000-8000-000000000000", "ghost@example.test");
  const sess = { access_token: tok, refresh_token: "r", expires_at: 4102444800, expires_in: 86400, token_type: "bearer", user: { id: "x", email: "x@example.test" } };
  await context.addCookies([{ name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(sess)).toString("base64url"), url: baseURL! }]);
  const r = await page.goto("/dashboard");
  expect(r?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/login/);
});
