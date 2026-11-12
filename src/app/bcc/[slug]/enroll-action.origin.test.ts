import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabase } from "@/test-utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (..._a: unknown[]) => {}),
  upserts: [] as { values: unknown; opts: unknown }[],
  enrollOnSignup: true,
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "bccacademy.io" }) }));
vi.mock("@/lib/programs", () => ({ isProductionHost: (h: string) => h === "bccacademy.io" }));
vi.mock("@/lib/email", () => ({ sendEventConfirmationEmail: mocks.send }));
vi.mock("@/lib/enroll", () => ({
  enrollEmailInTrack: async () => ({ inviteToken: "secret-invite-token", programSlug: "catalyst", isNew: false }),
}));
vi.mock("@/lib/programs/server", () => ({ getProgramWithOverrides: async () => ({ name: "Catalyst" }) }));
vi.mock("@/lib/landing-pages", () => ({
  getLandingPage: async () => ({
    nativeEnroll: true,
    comingSoon: false,
    enrollOnSignup: mocks.enrollOnSignup,
    trackSlug: "catalyst-labs",
    headline: "Catalyst Labs",
    signupQuestions: [],
    sessions: [],
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => {
    const base = makeSupabase((table) => {
      if (table === "students") return { data: [{ id: "stu-1" }] };
      if (table === "programs") return { data: [{ id: "prog-1" }] };
      return { data: null, error: null };
    });
    return {
      from(t: string) {
        const q = base.from(t) as Record<string, unknown>;
        q.upsert = async (values: unknown, opts: unknown) => {
          mocks.upserts.push({ values, opts });
          return { error: null };
        };
        return q;
      },
    };
  },
}));

import { enrollInCourse } from "./enroll-action";

const input = {
  slug: "catalyst-labs",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
  origin: "https://bccacademy.io",
};

beforeEach(() => {
  mocks.send.mockClear();
  mocks.upserts = [];
  mocks.enrollOnSignup = true;
});

describe("enrollInCourse links and enrollment write", () => {
  it("emails the invite link on the request host", async () => {
    await enrollInCourse(input);
    const arg = mocks.send.mock.calls[0][0] as { inviteLink: string };
    expect(arg.inviteLink).toBe("https://bccacademy.io/invite/secret-invite-token");
  });

  it("upserts student_tracks on the (student_id, track_slug) conflict target, ignoring duplicates", async () => {
    await enrollInCourse(input);
    expect(mocks.upserts).toHaveLength(1);
    expect(mocks.upserts[0].opts).toEqual({ onConflict: "student_id,track_slug", ignoreDuplicates: true });
    expect(mocks.upserts[0].values).toMatchObject({ student_id: "stu-1", track_slug: "catalyst-labs", program_id: "prog-1" });
  });

  it("rejects an invalid email before any write or email", async () => {
    const r = await enrollInCourse({ ...input, email: "not-an-email" });
    expect(r.ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("enrollInCourse origin handling", () => {
  it("builds the invite link from the server-derived host", async () => {
    await enrollInCourse({ ...input, origin: "https://other.example.test" });
    const arg = mocks.send.mock.calls[0][0] as { inviteLink: string; origin: string };
    expect(new URL(arg.inviteLink).host).toBe("bccacademy.io");
    expect(new URL(arg.origin).host).toBe("bccacademy.io");
  });
});
