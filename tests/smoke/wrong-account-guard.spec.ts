import { test, expect } from "@playwright/test";
import {
  addToAllowlist,
  deleteUserByEmail,
  mintMagicLink,
  randomEmail,
  removeFromAllowlist,
} from "./helpers/supabase";

// Guards the cross-account login bug: a magic link must never silently sign
// you in as a DIFFERENT account that's already logged in on the browser.
// (The callback carries ?email= and refuses to fall back to a mismatched
// session — see src/app/auth/callback/route.ts.)
//
// Requires env: SMOKE_BASE_URL, SMOKE_SUPABASE_URL, SMOKE_SUPABASE_SERVICE_ROLE_KEY.

const TRACK = "ai-literacy";
const PROGRAM_SLUG = "forte";

test("a failed magic link never falls back to a different signed-in account", async ({
  page,
  baseURL,
}) => {
  const accountA = randomEmail("guard-a");
  const accountB = randomEmail("guard-b"); // intended-but-never-authenticated email

  await addToAllowlist(accountA, TRACK);
  try {
    // 1. Sign in for real as account A.
    const linkA = await mintMagicLink(
      accountA,
      `${baseURL}/auth/callback?join=${PROGRAM_SLUG}&track=${TRACK}&email=${encodeURIComponent(accountA)}`,
    );
    await page.goto(linkA);
    await page.waitForURL(/\/dashboard(\b|\/|\?)/, { timeout: 30_000 });
    expect(page.url()).toContain("/dashboard");

    // 2. While A's session is live, hit the callback for B with a bad token.
    //    The token fails to exchange; without the guard the callback would
    //    fall back to A's session and land on the dashboard as A.
    // confirm=1 skips the anti-prefetch interstitial (which token_hash links now
    // show first) so this test exercises the verify/guard path directly.
    await page.goto(
      `${baseURL}/auth/callback?email=${encodeURIComponent(accountB)}&token_hash=invalid-token-hash&type=magiclink&confirm=1`,
    );

    // 3. Must NOT impersonate A — should bounce to a clean login instead.
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).not.toContain("/dashboard");
  } finally {
    await removeFromAllowlist(accountA, TRACK);
    await deleteUserByEmail(accountA);
  }
});
