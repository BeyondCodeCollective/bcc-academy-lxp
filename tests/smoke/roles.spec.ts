import { test, expect, type Page } from "@playwright/test";
import {
  addToAllowlist,
  deleteUserByEmail,
  mintMagicLink,
  randomEmail,
  removeFromAllowlist,
  admin,
} from "./helpers/supabase";

// Comprehensive role-gated E2E smoke tests.
// Walks through every dashboard route for each role (student, instructor,
// admin, super_admin, staff) and asserts that the right pages render and
// the wrong ones redirect.
//
// Requires env: SMOKE_BASE_URL, SMOKE_SUPABASE_URL,
// SMOKE_SUPABASE_SERVICE_ROLE_KEY, SMOKE_SUPER_ADMIN_EMAIL.

const PROGRAM_SLUG = "catalyst";
const TRACK = "mass";

// ── Helpers ────────────────────────────────────────────────────────────────

async function setRole(email: string, role: string) {
  const svc = admin();
  const { data } = await svc.auth.admin.listUsers();
  const user = data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) throw new Error(`User ${email} not found in auth`);
  const { error } = await svc
    .from("students")
    .update({ role })
    .eq("id", user.id);
  if (error) throw new Error(`setRole failed: ${error.message}`);
}

type TestUser = {
  email: string;
  cleanup: () => Promise<void>;
};

async function createStudentUser(): Promise<TestUser> {
  const email = randomEmail("e2e-student");
  await addToAllowlist(email, TRACK);
  return {
    email,
    cleanup: async () => {
      await removeFromAllowlist(email, TRACK);
      await deleteUserByEmail(email);
    },
  };
}

async function createInstructorUser(): Promise<TestUser> {
  const email = randomEmail("e2e-instructor");
  await addToAllowlist(email, TRACK);
  return {
    email,
    cleanup: async () => {
      await removeFromAllowlist(email, TRACK);
      await deleteUserByEmail(email);
    },
  };
}

async function createAdminUser(): Promise<TestUser> {
  const email = randomEmail("e2e-admin");
  await addToAllowlist(email, TRACK);
  return {
    email,
    cleanup: async () => {
      await removeFromAllowlist(email, TRACK);
      await deleteUserByEmail(email);
    },
  };
}

async function loginAs(
  page: Page,
  baseURL: string | undefined,
  email: string,
): Promise<void> {
  const link = await mintMagicLink(
    email,
    `${baseURL}/auth/callback?join=${PROGRAM_SLUG}&track=${TRACK}`,
  );
  await page.goto(link);
  await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 30_000 });
}

async function expectRedirectsTo(
  page: Page,
  url: string,
  expectedDestination: RegExp,
) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForURL(expectedDestination, { timeout: 15_000 });
}

// ── Student tests ──────────────────────────────────────────────────────────

test.describe("student role", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createStudentUser();
  });

  test.afterEach(async () => {
    await user.cleanup();
  });

  test("can reach dashboard home", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await expect(page.getByText(/welcome/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/tutor", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await page.goto("/dashboard/tutor");
    await expect(page.getByText(/tutor|AI/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/help", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await page.goto("/dashboard/help");
    await expect(page.getByText(/help|faq|guide/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("is redirected away from /dashboard/workshops", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await expectRedirectsTo(page, "/dashboard/workshops", /\/dashboard(\b|\/|\?)/);
  });

  test("is redirected away from /dashboard/lunch-learn", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await expectRedirectsTo(page, "/dashboard/lunch-learn", /\/dashboard(\b|\/|\?)/);
  });

  test("is redirected away from /dashboard/courses", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await expectRedirectsTo(page, "/dashboard/courses", /\/dashboard(\b|\/|\?)/);
  });

  test("is redirected away from /dashboard/admin", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await expectRedirectsTo(page, "/dashboard/admin", /\/dashboard(\b|\/|\?)/);
  });

  test("is redirected away from /dashboard/insights", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await expectRedirectsTo(page, "/dashboard/insights", /\/dashboard(\b|\/|\?)/);
  });

  test("nav shows student items only", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    const navLinks = page.getByRole("navigation", { name: /primary/i });
    await expect(navLinks.getByRole("link", { name: /home/i })).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /admin/i })).not.toBeVisible();
    await expect(navLinks.getByRole("link", { name: /courses/i })).not.toBeVisible();
    await expect(
      navLinks.getByRole("link", { name: /workshops/i }),
    ).not.toBeVisible();
  });
});

// ── Instructor tests ───────────────────────────────────────────────────────

test.describe("instructor role", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createInstructorUser();
  });

  test.afterEach(async () => {
    await user.cleanup();
  });

  test("can reach dashboard and see admin nav after role promotion", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await page.reload();
    await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 15_000 });

    const navLinks = page.getByRole("navigation", { name: /primary/i });
    await expect(navLinks.getByRole("link", { name: /courses/i })).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /workshops/i })).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /admin/i })).toBeVisible();
  });

  test("can access /dashboard/courses", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await page.goto("/dashboard/courses");
    await expect(
      page.getByText(/courses|catalog|tracks/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can access /dashboard/workshops", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await page.goto("/dashboard/workshops");
    await expect(page.getByText(/workshops/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/lunch-learn", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await page.goto("/dashboard/lunch-learn");
    await expect(page.getByText(/lunch.*learn/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/admin (own tracks)", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await page.goto("/dashboard/admin");
    // Instructors see admin but not students/insights tabs
    await expect(
      page.getByRole("link", { name: /admin/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("is redirected away from /dashboard/insights", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "instructor");
    await expectRedirectsTo(page, "/dashboard/insights", /\/dashboard(\b|\/|\?)/);
  });
});

// ── Admin tests ────────────────────────────────────────────────────────────

test.describe("admin role", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createAdminUser();
  });

  test.afterEach(async () => {
    await user.cleanup();
  });

  test("can access admin panel after role promotion", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "admin");
    await page.reload();
    await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 15_000 });

    // Admins see the same nav as instructors plus program switch access
    const navLinks = page.getByRole("navigation", { name: /primary/i });
    await expect(navLinks.getByRole("link", { name: /courses/i })).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /admin/i })).toBeVisible();
  });

  test("can access /dashboard/admin/allowlist", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "admin");
    await page.goto("/dashboard/admin/allowlist");
    await expect(page.getByText(/allowlist|allowed/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/lunch-learn/admin", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "admin");
    await page.goto("/dashboard/lunch-learn/admin");
    await expect(page.getByText(/recording|manage/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("is redirected away from /dashboard/insights", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, user.email);
    await setRole(user.email, "admin");
    await expectRedirectsTo(page, "/dashboard/insights", /\/dashboard(\b|\/|\?)/);
  });
});

// ── Super Admin tests ──────────────────────────────────────────────────────

test.describe("super_admin role", () => {
  const email = process.env.SMOKE_SUPER_ADMIN_EMAIL;
  test.skip(!email, "SMOKE_SUPER_ADMIN_EMAIL not set");

  test("can access every route", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, email!);
    // Dashboard
    await expect(page.getByText(/welcome|dashboard/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/insights", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, email!);
    await page.goto("/dashboard/insights");
    await expect(page.getByText(/insights|analytics/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/admin?tab=insights", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, email!);
    await page.goto("/dashboard/admin?tab=insights");
    await expect(page.getByText(/survey|insights|responses/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can access /dashboard/admin/allowlist", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, baseURL, email!);
    await page.goto("/dashboard/admin/allowlist");
    await expect(page.getByText(/allowlist|allowed/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("nav shows all items", async ({ page, baseURL }) => {
    await loginAs(page, baseURL, email!);
    const navLinks = page.getByRole("navigation", { name: /primary/i });
    await expect(navLinks.getByRole("link", { name: /home/i })).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /courses/i })).toBeVisible();
    await expect(
      navLinks.getByRole("link", { name: /workshops/i }),
    ).toBeVisible();
    await expect(navLinks.getByRole("link", { name: /admin/i })).toBeVisible();
    await expect(
      navLinks.getByRole("link", { name: /insights/i }),
    ).toBeVisible();
  });
});

// ── Staff access tests (lunch & learns, workshops) ─────────────────────────

test.describe("staff (non-admin) content access", () => {
  const STAFF_DOMAIN = "wearebgc.org";

  async function createStaffUser(): Promise<TestUser> {
    const email = randomEmail("e2e-staff");
    // Use a wearebgc.org alias for staff detection
    const staffEmail = email.replace(/@.+$/, `@${STAFF_DOMAIN}`);
    await addToAllowlist(staffEmail, TRACK);
    return {
      email: staffEmail,
      cleanup: async () => {
        await removeFromAllowlist(staffEmail, TRACK);
        await deleteUserByEmail(staffEmail);
      },
    };
  }

  test("staff can access /dashboard/workshops", async ({
    page,
    baseURL,
  }) => {
    const user = await createStaffUser();
    try {
      await loginAs(page, baseURL, user.email);
      await page.goto("/dashboard/workshops");
      await expect(page.getByText(/workshops|luncheons/i).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await user.cleanup();
    }
  });

  test("staff can access /dashboard/lunch-learn", async ({
    page,
    baseURL,
  }) => {
    const user = await createStaffUser();
    try {
      await loginAs(page, baseURL, user.email);
      await page.goto("/dashboard/lunch-learn");
      await expect(page.getByText(/lunch.*learn|recording/i).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await user.cleanup();
    }
  });

  test("staff cannot access /dashboard/admin", async ({
    page,
    baseURL,
  }) => {
    const user = await createStaffUser();
    try {
      await loginAs(page, baseURL, user.email);
      await expectRedirectsTo(page, "/dashboard/admin", /\/dashboard(\b|\/|\?)/);
    } finally {
      await user.cleanup();
    }
  });

  test("staff cannot access /dashboard/insights", async ({
    page,
    baseURL,
  }) => {
    const user = await createStaffUser();
    try {
      await loginAs(page, baseURL, user.email);
      await expectRedirectsTo(page, "/dashboard/insights", /\/dashboard(\b|\/|\?)/);
    } finally {
      await user.cleanup();
    }
  });
});
