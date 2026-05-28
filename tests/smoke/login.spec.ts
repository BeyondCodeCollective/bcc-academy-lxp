import { test, expect } from "@playwright/test";
import {
  addToAllowlist,
  deleteUserByEmail,
  mintMagicLink,
  randomEmail,
  removeFromAllowlist,
} from "./helpers/supabase";

// Pre-launch login smoke tests. Each test exercises a real magic-link
// round-trip via the Supabase admin API (no inbox needed) and asserts
// that the auth callback lands the user in the right place.
//
// Requires env: SMOKE_BASE_URL, SMOKE_SUPABASE_URL,
// SMOKE_SUPABASE_SERVICE_ROLE_KEY, SMOKE_SUPER_ADMIN_EMAIL.

const TRACK = "ai-literacy"; // Upskill Bahamas / AI Literacy
const PROGRAM_SLUG = "forte";

test("allowlisted email completes /join flow and reaches the dashboard", async ({
  page,
  baseURL,
}) => {
  const email = randomEmail("allow");
  await addToAllowlist(email, TRACK);
  try {
    const link = await mintMagicLink(
      email,
      `${baseURL}/auth/callback?join=${PROGRAM_SLUG}&track=${TRACK}`,
    );
    await page.goto(link);
    await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 30_000 });
    expect(page.url()).toContain("/dashboard");
  } finally {
    await removeFromAllowlist(email, TRACK);
    await deleteUserByEmail(email);
  }
});

test("non-allowlisted email sees the obfuscated confirmation copy", async ({
  page,
}) => {
  const email = randomEmail("denied");
  await page.goto(`/join/${PROGRAM_SLUG}?track=${TRACK}`);
  await page.getByPlaceholder(/your@email\.com/i).fill(email);
  await page
    .getByRole("button", { name: /Join|Sending/i })
    .click();
  // Same copy regardless of allowlist hit/miss — that's the point.
  await expect(page.getByText(/Check your email\.?/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText(/is on the list for this course/i),
  ).toBeVisible();
});

test("super-admin email lands in Catalyst dashboard with admin nav", async ({
  page,
  baseURL,
}) => {
  const email = process.env.SMOKE_SUPER_ADMIN_EMAIL;
  test.skip(!email, "SMOKE_SUPER_ADMIN_EMAIL not set");
  const link = await mintMagicLink(email!, `${baseURL}/auth/callback`);
  await page.goto(link);
  await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 30_000 });
  // Admin nav surfaces — proves role resolved to admin/super_admin, not student.
  await expect(
    page.getByRole("link", { name: /Admin/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
});
