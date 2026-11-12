import { test, expect } from "./support/test";
import { loginAs, auditPage } from "./support/helpers";

// The stub does not scope rows per caller, so these tests assert what the UI
// chooses to show for a role (tabs, courses, controls), not RLS-level scoping.
test.describe("instructor journey", () => {
  test("sees only assigned course, no admin-only tabs", async ({ page, context }, info) => {
    await loginAs(context, "instructor", { program: "atg" });
    await auditPage(page, "/dashboard/admin", info, { label: "instructor admin home" });
    // the (ended) MASS course sits under a collapsed "Completed" group, so assert on presence not visibility
    expect(await page.getByText(/MASS Wraparound/i).count()).toBeGreaterThan(0);
    await expect(page.getByText(/Tech\+/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Analytics", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "People", exact: true })).toHaveCount(0);
  });

  test("attendance tab renders", async ({ page, context }) => {
    await loginAs(context, "instructor", { program: "atg" });
    await page.goto("/dashboard/admin?tab=attendance");
    await expect(page.getByText(/Who's showing up|Attendance/i).first()).toBeVisible();
  });

  test("admin-only pages bounce an instructor", async ({ page, context }) => {
    await loginAs(context, "instructor", { program: "atg" });
    for (const p of ["/dashboard/admin/programs/new", "/dashboard/admin/organizations", "/dashboard/admin/health", "/dashboard/admin/insights"]) {
      await page.goto(p, { waitUntil: "domcontentloaded" }).catch(() => {});
      // refusal is a streamed redirect, so poll rather than read the URL once
      await expect.poll(() => new URL(page.url()).pathname, { message: `${p} should bounce an instructor`, timeout: 15000 }).not.toBe(p);
    }
  });
});

test.describe("admin journey", () => {
  test("admin home, people tab, Add people entry", async ({ page, context }, info) => {
    await loginAs(context, "super", { program: "atg" });
    await auditPage(page, "/dashboard/admin?tab=students", info, { label: "admin people tab" });
    await expect(page.getByRole("button", { name: /Add people/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Bulk assign/i })).toBeVisible();
  });

  test("course builder entry renders for admin", async ({ page, context }, info) => {
    await loginAs(context, "super", { program: "atg" });
    await auditPage(page, "/dashboard/admin/programs/new", info, { label: "course builder new" });
    await expect(page.getByRole("heading", { name: /New Course/i })).toBeVisible();
  });

  test("insights / analytics tab renders", async ({ page, context }) => {
    await loginAs(context, "super", { program: "atg" });
    const r = await page.goto("/dashboard/admin?tab=insights");
    expect(r?.status()).toBeLessThan(500);
    await expect(page.getByText(/Application error|Internal Server Error/i)).toHaveCount(0);
  });

  test("Preview as student is a real restriction, and can be exited", async ({ page, context }) => {
    await loginAs(context, "super", { program: "atg" });
    await page.goto("/dashboard/admin?tab=students");
    await page.getByRole("button", { name: /Preview as student/i }).click();
    await page.getByRole("button", { name: /MASS Wraparound/i }).last().click();
    await expect(page.getByRole("button", { name: /Previewing/i })).toBeVisible({ timeout: 20000 });
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "preview-as-student" && c.value)).toBe(true);

    for (const p of ["/dashboard/admin/programs/new", "/dashboard/admin/organizations", "/dashboard/admin/health", "/dashboard/admin/applications", "/dashboard/admin/invites"]) {
      await page.goto(p, { waitUntil: "domcontentloaded" }).catch(() => {});
      await expect.poll(() => new URL(page.url()).pathname, { message: `${p} must be refused while previewing`, timeout: 15000 }).not.toBe(p);
    }
    // admin-only API is refused too
    const csv = await page.request.get("/api/insights/csv", { maxRedirects: 0 });
    expect([401, 403, 302, 307], `insights csv while previewing -> ${csv.status()}`).toContain(csv.status());

    // exit
    await page.goto("/dashboard/track/mass");
    await page.getByRole("button", { name: /Previewing/i }).click();
    await page.getByRole("button", { name: /Exit preview/i }).first().click();
    await expect.poll(async () => (await context.cookies()).some((c) => c.name === "preview-as-student" && c.value)).toBe(false);
    await page.goto("/dashboard/admin/programs/new");
    await expect(page.getByRole("heading", { name: /New Course/i })).toBeVisible();
  });
});
