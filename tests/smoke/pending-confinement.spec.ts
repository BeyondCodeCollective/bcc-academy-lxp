import { test, expect } from "@playwright/test";
import {
  admin,
  mintMagicLink,
  addToAllowlist,
  removeFromAllowlist,
  deleteUserByEmail,
  randomEmail,
} from "./helpers/supabase";

// Regression guard for the "pending registrant confinement" access control.
//
// A learner enrolled ONLY in a not-yet-started course (an event registrant) must
// be confined to their holding page — they must NOT reach program content
// (Workshops, Resources, AI Tutor), other courses, or the tutor/zoom APIs by
// typing the URL. This test sets up a real pending learner against the deployed
// app and asserts every protected entry point bounces.
//
// Requires (same as the other smoke tests): SMOKE_BASE_URL,
// SMOKE_SUPABASE_URL, SMOKE_SUPABASE_SERVICE_ROLE_KEY.
// Run: SMOKE_BASE_URL=https://bccacademy.io pnpm test:smoke pending-confinement

const BASE = process.env.SMOKE_BASE_URL ?? "https://bccacademy.io";

// A course whose start date is in the future (Game On = 2026-07-11). If this
// ever goes "started", point this at any other not-yet-started course.
const PENDING_TRACK = "game-on";
const HOLDING_PATH = `/dashboard/track/${PENDING_TRACK}`;

test.describe("pending registrant confinement", () => {
  let email: string;

  test.beforeAll(async () => {
    email = randomEmail("pending");
    await addToAllowlist(email, PENDING_TRACK);
  });

  test.afterAll(async () => {
    await removeFromAllowlist(email, PENDING_TRACK);
    await deleteUserByEmail(email);
  });

  test("is confined to the holding page", async ({ page }) => {
    // Log in via a fresh magic link, joining the not-yet-started course.
    const link = await mintMagicLink(
      email,
      `${BASE}/auth/callback?join=catalyst&track=${PENDING_TRACK}&email=${encodeURIComponent(email)}`,
    );
    await page.goto(link, { waitUntil: "domcontentloaded" });

    // Guarantee the pending enrollment exists (don't depend on callback timing).
    const svc = admin();
    const { data: prog } = await svc.from("programs").select("id").eq("slug", "catalyst").single();
    const { data: list } = await svc.auth.admin.listUsers();
    const u = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u && prog) {
      await svc
        .from("student_tracks")
        .upsert(
          { student_id: u.id, track_slug: PENDING_TRACK, program_id: prog.id },
          { onConflict: "student_id,track_slug,program_id" },
        );
    }

    // Program pages + the home + another course all bounce to the holding page.
    for (const path of [
      "/dashboard/workshops",
      "/dashboard/resources",
      "/dashboard/tutor",
      "/dashboard",
      "/dashboard/track/ai-fundamentals",
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      expect(page.url(), `${path} should redirect a pending learner to the holding page`).toContain(
        HOLDING_PATH,
      );
    }

    // The learner's OWN holding page is reachable.
    await page.goto(`${BASE}${HOLDING_PATH}`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain(HOLDING_PATH);

    // API entry points (not under the page layer) 403 for a pending learner.
    const tutor = await page.request.post(`${BASE}/api/tutor`, {
      data: { messages: [{ role: "user", content: "hi" }] },
    });
    expect(tutor.status(), "tutor API must 403 a pending learner").toBe(403);

    const zoom = await page.request.post(`${BASE}/api/zoom-signature`, {
      data: { meetingNumber: "1234567890" },
    });
    expect(zoom.status(), "zoom-signature must 403 a pending learner").toBe(403);
  });
});
