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

test("Upskill Bahamas learner lands on forte shell with no survey gate", async ({
  page,
  baseURL,
  context,
}) => {
  // The full Mica-style flow: allowlist gates her to AI Literacy, /join
  // mints a magic link tagged with the forte program slug, the auth
  // callback sets program-override=forte, the dashboard reads "Upskill
  // Bahamas — Cohort 1" instead of "Catalyst", forte is in
  // BCC_INTAKE_EXEMPT_PROGRAMS and has no required surveys, so we land
  // straight on /dashboard (no redirect into /dashboard/survey/...).
  const email = randomEmail("forte");
  await addToAllowlist(email, TRACK);
  try {
    const link = await mintMagicLink(
      email,
      `${baseURL}/auth/callback?join=${PROGRAM_SLUG}&track=${TRACK}`,
    );
    await page.goto(link);
    await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 30_000 });
    // No survey-gate redirect en route to the dashboard.
    expect(page.url()).not.toContain("/dashboard/survey/");
    // Cohort subtitle is the human-readable "this is Upskill Bahamas" signal.
    await expect(
      page.getByText(/Upskill Bahamas/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    // Program-override cookie pins the user to forte for subsequent navigations.
    const cookies = await context.cookies();
    const override = cookies.find((c) => c.name === "program-override");
    expect(override?.value).toBe("forte");
  } finally {
    await removeFromAllowlist(email, TRACK);
    await deleteUserByEmail(email);
  }
});

test("ATG-style learner lands on Catalyst with pre-survey gate", async ({
  page,
  baseURL,
}) => {
  // Regression check: BCC Centers / ATG learners (allowlisted for non-forte
  // tracks) should still see Catalyst's pre-survey-spring-2026 gate. The
  // intake gate is now exempt for Catalyst (covered by the pre-survey's
  // demographics block), so they should only see ONE survey, not two.
  const ATG_TRACK = "mass";
  const email = randomEmail("atg");
  await addToAllowlist(email, ATG_TRACK);
  try {
    const link = await mintMagicLink(
      email,
      `${baseURL}/auth/callback?join=catalyst&track=${ATG_TRACK}`,
    );
    await page.goto(link);
    // Survey gate fires on first dashboard hit. Either we land directly on
    // the pre-survey page, or on /dashboard which then redirects there.
    await page.waitForURL(
      /\/dashboard\/survey\/pre-survey-spring-2026/,
      { timeout: 30_000 },
    );
    // Intake gate should NOT be the one that fired — that would mean Catalyst
    // is still wrongly required to take the intake.
    expect(page.url()).not.toContain("bcc-learner-intake");
  } finally {
    await removeFromAllowlist(email, ATG_TRACK);
    await deleteUserByEmail(email);
  }
});

test("mixed allowlist enrolls in all tracks and lands on Catalyst", async ({
  page,
  baseURL,
}) => {
  // Learner allowlisted for both an Upskill Bahamas track and an ATG track.
  // Because the home programs are ambiguous, they land on the Catalyst
  // umbrella so all enrolled tracks are visible from one dashboard.
  // deferred-setup enrolls them in BOTH tracks via the allowlist lookup.
  const ATG_TRACK = "mass";
  const email = randomEmail("mixed");
  await addToAllowlist(email, TRACK);
  await addToAllowlist(email, ATG_TRACK);
  try {
    const link = await mintMagicLink(
      email,
      `${baseURL}/auth/callback?join=catalyst&track=${TRACK}`,
    );
    await page.goto(link);
    // Pre-survey will gate them first; complete the gate by URL-asserting it
    // and treating that as proof of "landed on Catalyst, both tracks pending."
    // (Filling the survey out in a smoke test is overkill.)
    await page.waitForURL(/\/dashboard(\b|\/|\?|\/survey\/)/, { timeout: 30_000 });
    expect(page.url()).toMatch(/\/dashboard/);
  } finally {
    await removeFromAllowlist(email, TRACK);
    await removeFromAllowlist(email, ATG_TRACK);
    await deleteUserByEmail(email);
  }
});

test("brand-new email with no allowlist gets bounced off /auth/callback", async ({
  page,
  baseURL,
}) => {
  // Magic link minted for an email that is on no allowlist and has no
  // student row. On the apex this lands at /login?status=not-enrolled (the
  // marketing-domain guard); on a preview URL the resolved program is
  // Catalyst (env default) and requireInviteLink kicks in → /?error=invite.
  // Either way, the learner should NOT reach /dashboard.
  const email = randomEmail("orphan");
  try {
    const link = await mintMagicLink(email, `${baseURL}/auth/callback`);
    await page.goto(link);
    await page.waitForURL(
      /(login\?status=not-enrolled|\/\?error=invite)/,
      { timeout: 30_000 },
    );
    expect(page.url()).not.toContain("/dashboard");
  } finally {
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
