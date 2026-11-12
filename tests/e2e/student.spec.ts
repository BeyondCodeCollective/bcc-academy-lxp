import { test, expect } from "./support/test";
import { loginAs, auditPage, watch } from "./support/helpers";

test.describe("student journey (stubbed Supabase)", () => {
  test("home lands in the single enrolled course; no page errors", async ({ page, context }, info) => {
    await loginAs(context, "student");
    const w = watch(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/track\/mass/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /MASS Wraparound/i })).toBeVisible();
    await auditPage(page, "/dashboard/track/mass", info, { label: "student course overview" });
    expect(w.pageErrors).toEqual([]);
  });

  test("schedule: calendar and list views toggle", async ({ page, context }) => {
    await loginAs(context, "student");
    await page.goto("/dashboard/track/mass");
    const cal = page.getByRole("button", { name: "Calendar", exact: true });
    const list = page.getByRole("button", { name: "List", exact: true });
    await expect(cal).toBeVisible();
    // Mobile defaults to List and uses a compact calendar without "SUN" headers (not asserted there).
    await cal.click();
    await expect(page.getByText(/Show \d+ earlier sessions/)).toBeHidden();
    await list.click();
    await expect(page.getByText(/Show \d+ earlier sessions/)).toBeVisible();
    await cal.click();
    if (test.info().project.name === "desktop") await expect(page.getByText(/^(SUN|Sun)$/).first()).toBeVisible();
  });

  test("session (week) page renders", async ({ page, context }, info) => {
    await loginAs(context, "student");
    await auditPage(page, "/dashboard/track/mass/1", info, { label: "student session page" });
    await expect(page.getByRole("heading", { name: /Storytelling/i }).first()).toBeVisible();
  });

  test("survey and certificate routes do not crash for an unknown id", async ({ page, context }) => {
    await loginAs(context, "student");
    const r1 = await page.goto("/dashboard/survey/does-not-exist", { waitUntil: "domcontentloaded" });
    expect(r1?.status()).toBeLessThan(500);
    const r2 = await page.request.get("/certificate/00000000-0000-4000-8000-00000000dead", { maxRedirects: 0 });
    expect([200, 307, 404], `certificate unknown id -> ${r2.status()}`).toContain(r2.status());
  });

  test("learner with no enrollment sees an empty state", async ({ page, context }, info) => {
    await loginAs(context, "empty");
    await auditPage(page, "/dashboard", info, { label: "empty learner home" });
    await expect(page.getByText(/No courses assigned yet/i)).toBeVisible();
  });

  test("course not yet started: seat saved, start date shown, no live join", async ({ page, context }) => {
    await loginAs(context, "future");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/track\/techplus/, { timeout: 30000 });
    await expect(page.getByText(/YOUR SEAT IS SAVED/i)).toBeVisible();
    await expect(page.getByText(/^Starts /).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /join/i })).toHaveCount(0);
  });

  test("live page for a session that is not today does not offer a live join", async ({ page, context }) => {
    await loginAs(context, "future");
    await page.goto("/dashboard/track/techplus/1/live");
    await expect(page).not.toHaveURL(/\/live/);
    await expect(page.getByRole("button", { name: /join/i })).toHaveCount(0);
    await expect(page.locator("iframe[src*='zoom']")).toHaveCount(0);
  });

  test("running course shows a week page for the current session", async ({ page, context }) => {
    await loginAs(context, "student");
    await page.goto("/dashboard/track/mass/8");
    await expect(page.getByText(/Career Expo/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /join live/i })).toHaveCount(0);
  });
});
