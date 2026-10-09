import { describe, it, expect } from "vitest";
import { profileSnoozeCookie, PROFILE_SNOOZE_COOKIE, PROFILE_SNOOZE_DAYS } from "@/lib/onboarding/profile-snooze";

describe("profileSnoozeCookie", () => {
  it("lasts exactly the snooze window, site-wide", () => {
    const c = profileSnoozeCookie();
    expect(c.startsWith(`${PROFILE_SNOOZE_COOKIE}=1`)).toBe(true);
    expect(c).toContain(`max-age=${PROFILE_SNOOZE_DAYS * 86400}`);
    expect(c).toContain("path=/");
    expect(PROFILE_SNOOZE_DAYS).toBe(7);
  });
});
