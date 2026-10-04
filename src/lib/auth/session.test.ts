import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the real getSessionContext/bustProfileCache with Supabase, after()
// and the name/staff helpers stubbed at their module boundaries.
type Result = { data: unknown };

const claimsResult = vi.fn<() => Promise<{ data: { claims?: Record<string, unknown> } | null }>>();
const studentRead = vi.fn<() => Promise<Result>>();
const programLookup = vi.fn<() => Promise<Result>>();
const upsert = vi.fn(async () => ({}));
const update = vi.fn();
const afterCallbacks: Array<() => Promise<void>> = [];

// A chainable query builder: every filter returns itself, terminal calls
// resolve from the per-table stubs above.
function builder(table: string, svc: boolean) {
  const b: Record<string, unknown> = {};
  const self = () => b;
  for (const m of ["select", "eq", "order", "or"]) b[m] = self;
  b.maybeSingle = () => (table === "programs" ? programLookup() : studentRead());
  b.upsert = (...args: unknown[]) => upsert(...(args as []));
  b.update = (...args: unknown[]) => {
    update(table, svc, ...args);
    return { eq: async () => ({}) };
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: claimsResult },
    from: (t: string) => builder(t, false),
  }),
  createServiceClient: () => ({ from: (t: string) => builder(t, true) }),
}));
vi.mock("next/server", () => ({
  after: (fn: () => Promise<void>) => void afterCallbacks.push(fn),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/auth/admins", () => ({ determineRole: () => "student" }));
vi.mock("@/lib/auth/seed-name", () => ({
  seedNameForEmail: async () => ({ first_name: "Ada", last_name: "Lovelace" }),
}));
vi.mock("@/lib/auth/staff", () => ({ resolveIsStaff: async () => false }));

import { getSessionContext, bustProfileCache } from "@/lib/auth/session";

const student = { id: "u1", email: "a@b.org", role: "student", first_name: "Ada" };
const signedInAs = (sub: string, email?: unknown) =>
  claimsResult.mockResolvedValue({ data: { claims: { sub, email } } });

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  studentRead.mockResolvedValue({ data: student });
  programLookup.mockResolvedValue({ data: { id: "hub-1" } });
});
afterEach(() => vi.useRealTimers());

describe("getSessionContext: identity", () => {
  it("returns null with no claims, and never touches the students table", async () => {
    claimsResult.mockResolvedValue({ data: null });
    expect(await getSessionContext()).toBeNull();
    expect(studentRead).not.toHaveBeenCalled();
  });

  it("returns null when the token has no subject", async () => {
    claimsResult.mockResolvedValue({ data: { claims: {} } });
    expect(await getSessionContext()).toBeNull();
  });

  it("maps claims to the context, treating a non-string email as absent", async () => {
    signedInAs("u-identity", 42);
    const ctx = await getSessionContext();
    expect(ctx).toEqual({ userId: "u-identity", userEmail: null, student });
  });
});

describe("getSessionContext: profile cache", () => {
  it("serves repeat calls from the cache inside the TTL", async () => {
    signedInAs("u-cache", "a@b.org");
    await getSessionContext();
    await getSessionContext();
    expect(studentRead).toHaveBeenCalledTimes(1);
  });

  it("re-reads the students table once the 60s TTL has passed", async () => {
    vi.useFakeTimers();
    signedInAs("u-ttl", "a@b.org");
    await getSessionContext();
    vi.advanceTimersByTime(59_000);
    await getSessionContext();
    expect(studentRead).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2_000);
    await getSessionContext();
    expect(studentRead).toHaveBeenCalledTimes(2);
  });

  it("bustProfileCache forces the next call to re-read", async () => {
    signedInAs("u-bust", "a@b.org");
    await getSessionContext();
    bustProfileCache("u-bust");
    await getSessionContext();
    expect(studentRead).toHaveBeenCalledTimes(2);
  });

  it("busting one user leaves another user's cache alone", async () => {
    signedInAs("u-keep", "k@b.org");
    await getSessionContext();
    bustProfileCache("someone-else");
    await getSessionContext();
    expect(studentRead).toHaveBeenCalledTimes(1);
  });
});

describe("getSessionContext: ghost self-heal", () => {
  it("creates the missing profile under the hub program, then re-reads it", async () => {
    signedInAs("u-ghost", "ghost@b.org");
    studentRead.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: student });
    const ctx = await getSessionContext();
    expect(upsert).toHaveBeenCalledWith(
      {
        id: "u-ghost",
        email: "ghost@b.org",
        first_name: "Ada",
        last_name: "Lovelace",
        role: "student",
        is_staff: false,
        program_id: "hub-1",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(ctx?.student).toEqual(student);
  });

  it("falls back to an empty email when the token carries none", async () => {
    signedInAs("u-noemail");
    studentRead.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: student });
    await getSessionContext();
    expect((upsert.mock.calls[0] as unknown[])[0]).toMatchObject({ email: "" });
  });

  it("returns a null student, and skips the activity write, if the hub program is missing", async () => {
    signedInAs("u-nohub", "n@b.org");
    studentRead.mockResolvedValueOnce({ data: null });
    programLookup.mockResolvedValueOnce({ data: null });
    const ctx = await getSessionContext();
    expect(ctx).toEqual({ userId: "u-nohub", userEmail: "n@b.org", student: null });
    expect(upsert).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });
});

describe("getSessionContext: last_activity_at", () => {
  it("writes it through after(), as the service client, only once the callback runs", async () => {
    signedInAs("u-activity", "a@b.org");
    await getSessionContext();
    expect(update).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(update).toHaveBeenCalledTimes(1);
    const [table, svc, patch] = update.mock.calls[0];
    expect(table).toBe("students");
    expect(svc).toBe(true);
    expect(Date.parse((patch as { last_activity_at: string }).last_activity_at)).not.toBeNaN();
  });

  it("does not schedule a write on a cache hit", async () => {
    signedInAs("u-activity-hit", "a@b.org");
    await getSessionContext();
    afterCallbacks.length = 0;
    await getSessionContext();
    expect(afterCallbacks).toHaveLength(0);
  });
});
