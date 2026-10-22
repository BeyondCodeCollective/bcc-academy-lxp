import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  existing: null as { id: string; last_confirmation_at: string | null } | null,
  claimed: [] as { id: string }[],
  account: [] as { id: string }[],
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  questions: [] as { id: string; label: string; options: string[] }[],
}));

vi.mock("@/lib/email", () => ({ sendEventConfirmationEmail: mocks.send }));
vi.mock("@/lib/enroll", () => ({
  enrollEmailInTrack: async () => ({ inviteToken: "tok", programSlug: "catalyst", isNew: false }),
}));
vi.mock("@/lib/programs/server", () => ({ getProgramWithOverrides: async () => ({ name: "Catalyst" }) }));
vi.mock("@/lib/landing-pages", () => ({
  getLandingPage: async () => ({
    nativeEnroll: true,
    comingSoon: false,
    trackSlug: "catalyst-labs",
    headline: "Catalyst Labs",
    signupQuestions: mocks.questions,
    sessions: [{ id: "2026-11-19", label: "Nov 19", startUtc: "2026-11-19T23:00:00Z", endUtc: null, timezone: "America/New_York" }],
  }),
}));

// Minimal chainable stand-in for the PostgREST builder: every filter returns the
// builder, and awaiting it (or maybeSingle) resolves what the test configured.
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from(table: string) {
      let op: "select" | "update" | "insert" = "select";
      const q: Record<string, unknown> = {};
      const chain = () => q;
      for (const m of ["eq", "is", "ilike", "or", "limit"]) q[m] = chain;
      q.select = () => q;
      q.update = (values: Record<string, unknown>) => {
        op = "update";
        mocks.updates.push(values);
        return q;
      };
      q.insert = async (values: Record<string, unknown>) => {
        mocks.inserts.push(values);
        return { error: null };
      };
      q.maybeSingle = async () => ({ data: mocks.existing });
      q.then = (resolve: (v: unknown) => void) => {
        if (table === "students") return resolve({ data: mocks.account });
        return resolve({ data: op === "update" ? mocks.claimed : [] });
      };
      return q;
    },
  }),
}));

import { enrollInCourse } from "./enroll-action";

const input = {
  slug: "catalyst-labs",
  firstName: "Gabrielle",
  lastName: "Newsam",
  email: "GDNewsam@msn.com",
  sessionId: "2026-11-19",
  origin: "https://bccacademy.io",
};

beforeEach(() => {
  mocks.send.mockReset().mockResolvedValue(undefined);
  mocks.existing = null;
  mocks.claimed = [];
  mocks.account = [];
  mocks.updates = [];
  mocks.inserts = [];
  mocks.questions = [];
});

describe("enrollInCourse confirmation email", () => {
  it("confirms a new signup and stamps last_confirmation_at", async () => {
    expect(await enrollInCourse(input)).toEqual({ ok: true, enrolled: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: "gdnewsam@msn.com", returning: false });
    expect(mocks.inserts[0].last_confirmation_at).toEqual(expect.any(String));
  });

  it("uses returning-user wording when the email already has an account", async () => {
    mocks.account = [{ id: "s1" }];
    await enrollInCourse(input);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ returning: true });
  });

  it("re-sends on a repeat submit once the throttle window has passed", async () => {
    mocks.existing = { id: "r1", last_confirmation_at: "2026-10-16T19:16:25Z" };
    mocks.claimed = [{ id: "r1" }];
    mocks.account = [{ id: "s1" }];
    expect(await enrollInCourse(input)).toEqual({ ok: true, enrolled: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ returning: true });
    expect(mocks.inserts).toHaveLength(0);
  });

  it("does not re-send inside the 10 minute window", async () => {
    mocks.existing = { id: "r1", last_confirmation_at: new Date().toISOString() };
    mocks.claimed = [];
    expect(await enrollInCourse(input)).toEqual({ ok: true, enrolled: true });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.inserts).toHaveLength(0);
  });

  it("releases the claim and reports failure when a repeat send fails", async () => {
    mocks.existing = { id: "r1", last_confirmation_at: "2026-10-16T19:16:25Z" };
    mocks.claimed = [{ id: "r1" }];
    mocks.send.mockRejectedValue(new Error("resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await enrollInCourse(input);
    expect(res.ok).toBe(false);
    expect(mocks.updates.at(-1)).toEqual({ last_confirmation_at: "2026-10-16T19:16:25Z" });
  });
});

describe("signup questions", () => {
  const resident = { id: "resident", label: "Are you a City of South Fulton resident?", options: ["Yes", "No", "Unsure"] };

  it("rejects a signup that skips a required question", async () => {
    mocks.questions = [resident];
    const res = await enrollInCourse(input);
    expect(res).toEqual({ ok: false, error: `Please answer: ${resident.label}` });
    expect(mocks.inserts).toHaveLength(0);
  });

  it("rejects an answer that is not one of the choices", async () => {
    mocks.questions = [resident];
    const res = await enrollInCourse({ ...input, answers: { resident: "Maybe" } });
    expect(res.ok).toBe(false);
    expect(mocks.inserts).toHaveLength(0);
  });

  it("stores each answer under its question text", async () => {
    mocks.questions = [resident];
    const res = await enrollInCourse({ ...input, answers: { resident: "Yes" } });
    expect(res.ok).toBe(true);
    expect(mocks.inserts[0]?.answers).toEqual({ [resident.label]: "Yes" });
  });
});
