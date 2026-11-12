import { test, expect } from "./support/test";

const WALLED = [
  "/dashboard",
  "/dashboard/admin",
  "/dashboard/admin?tab=students",
  "/dashboard/admin/insights",
  "/dashboard/admin/programs/new",
  "/dashboard/admin/health",
  "/dashboard/admin/organizations",
  "/dashboard/admin/applications",
  "/dashboard/admin/events",
  "/dashboard/courses",
  "/dashboard/track/mass",
  "/dashboard/track/mass/1",
  "/dashboard/track/mass/1/live",
  "/dashboard/survey/some-survey",
  "/dashboard/settings",
  "/dashboard/help",
  "/dashboard/tutor",
  "/dashboard/insights",
  "/dashboard/resources",
  "/dashboard/agreement",
  "/dashboard/assessment",
  "/dashboard/lunch-learn",
  "/dashboard/workshops",
  "/dashboard/exam/network-plus-post",
];

test.describe("logged-out visitors are walled off", () => {
  for (const url of WALLED) {
    test(url, async ({ page }) => {
      await page.goto(url);
      const u = new URL(page.url());
      expect(u.origin).toBe(new URL(test.info().project.use.baseURL!).origin);
      expect(u.pathname).toBe("/login");
      // proxy keeps the path (not the query) as a safe ?next=
      expect(u.searchParams.get("next")).toBe(new URL(url, "http://x").pathname);
      await expect(page.getByLabel("Email address")).toBeVisible();
    });
  }
});

test.describe("?next= cannot lead off site", () => {
  const EVIL = ["//evil.example.test", "/\\evil.example.test", "https://evil.example.test", "/dashboard/../..//evil.example.test", "javascript:alert(1)"];
  for (const next of EVIL) {
    test(`/login?next=${next}`, async ({ page }) => {
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await expect(page.getByLabel("Email address")).toBeVisible();
      expect(new URL(page.url()).hostname).toBe("localhost");
    });
  }

  test("auth callback with hostile next stays on origin", async ({ request, baseURL }) => {
    for (const next of ["//evil.example.test", "/\\evil.example.test", "https://evil.example.test"]) {
      const r = await request.get(`/auth/callback?code=bogus&next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
      const loc = r.headers()["location"] ?? "";
      expect(r.status()).toBeLessThan(400);
      expect(new URL(loc, baseURL).hostname, `callback next=${next} -> ${loc}`).toBe("localhost");
      expect(loc).not.toContain("evil.example.test");
    }
  });

  test("invite route ignores hostile next", async ({ request, baseURL }) => {
    const r = await request.get(`/invite/not-a-token?next=${encodeURIComponent("//evil.example.test")}`, { maxRedirects: 0 });
    const loc = r.headers()["location"] ?? "";
    expect(new URL(loc || "/", baseURL).hostname).toBe("localhost");
  });
});
